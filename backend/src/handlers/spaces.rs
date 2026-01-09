use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::auth::{create_token, Auth};
use crate::models::*;
use crate::state::AppState;

pub fn generate_code() -> String {
    nanoid::nanoid!(8, &nanoid::alphabet::SAFE)
}

pub async fn create_space(
    State(state): State<AppState>,
    Json(req): Json<CreateSpaceRequest>,
) -> Result<Json<CreateSpaceResponse>, (StatusCode, String)> {
    let code = generate_code();

    // Create space first
    let space = sqlx::query_as::<_, (Uuid, String, String, bool)>(
        "INSERT INTO spaces (code, name, is_public, auto_finish_minutes) VALUES ($1, $2, $3, $4) RETURNING id, code, name, is_public"
    )
    .bind(&code)
    .bind(&req.name)
    .bind(req.is_public)
    .bind(req.auto_finish_minutes)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Create creator as first user
    let user_id = sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO space_users (space_id, nickname) VALUES ($1, $2) RETURNING id"
    )
    .bind(space.0)
    .bind(&req.creator_nickname)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Set creator_id on space
    sqlx::query("UPDATE spaces SET creator_id = $1 WHERE id = $2")
        .bind(user_id)
        .bind(space.0)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Generate token
    let token = create_token(user_id, space.0, &req.creator_nickname, &state.jwt_secret)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(CreateSpaceResponse {
        token,
        user_id,
        space_id: space.0,
        code: space.1,
        name: space.2,
        is_public: space.3,
        is_creator: true,
    }))
}

pub async fn list_public_spaces(
    State(state): State<AppState>,
) -> Result<Json<Vec<PublicSpace>>, (StatusCode, String)> {
    let spaces = sqlx::query_as::<_, (Uuid, String, String, i64)>(
        r#"
        SELECT s.id, s.code, s.name, COUNT(su.id) as member_count
        FROM spaces s
        LEFT JOIN space_users su ON s.id = su.space_id
        WHERE s.is_public = true AND s.is_finished = false
        GROUP BY s.id
        ORDER BY member_count DESC
        "#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(
        spaces
            .into_iter()
            .map(|row| PublicSpace {
                id: row.0,
                code: row.1,
                name: row.2,
                member_count: row.3,
            })
            .collect(),
    ))
}

pub async fn involve(
    State(state): State<AppState>,
    Json(req): Json<InvolveRequest>,
) -> Result<Json<InvolveResponse>, (StatusCode, String)> {
    // Find space by code
    let space = sqlx::query_as::<_, (Uuid, String, bool)>(
        "SELECT id, name, is_finished FROM spaces WHERE code = $1"
    )
    .bind(&req.code)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Space not found".to_string()))?;

    // Check if space is finished
    if space.2 {
        return Err((StatusCode::GONE, "This space has been finished".to_string()));
    }

    // Create user in space
    let user_id = sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO space_users (space_id, nickname) VALUES ($1, $2) RETURNING id"
    )
    .bind(space.0)
    .bind(&req.nickname)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        if e.to_string().contains("duplicate") {
            (StatusCode::CONFLICT, "Nickname already taken in this space".to_string())
        } else {
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        }
    })?;

    // Update last activity
    sqlx::query("UPDATE spaces SET last_activity = NOW() WHERE id = $1")
        .bind(space.0)
        .execute(&state.db)
        .await
        .ok();

    // Generate JWT token
    let token = create_token(user_id, space.0, &req.nickname, &state.jwt_secret)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(InvolveResponse {
        token,
        user_id,
        space_id: space.0,
        space_name: space.1,
        nickname: req.nickname,
        is_creator: false,
    }))
}

pub async fn leave_space(
    State(state): State<AppState>,
    auth: Auth,
) -> Result<StatusCode, (StatusCode, String)> {
    // Delete user from space (this will cascade delete their shots too due to FK)
    sqlx::query("DELETE FROM space_users WHERE id = $1 AND space_id = $2")
        .bind(auth.0.sub)
        .bind(auth.0.space_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_space(
    State(state): State<AppState>,
    auth: Auth,
    Path(id): Path<Uuid>,
) -> Result<Json<SpaceInfo>, (StatusCode, String)> {
    // Verify user belongs to this space
    if auth.0.space_id != id {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    let space = sqlx::query_as::<_, (Uuid, String, String, bool, Option<Uuid>, bool, bool)>(
        "SELECT id, code, name, is_public, creator_id, is_finished, ban_kicked_users FROM spaces WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Space not found".to_string()))?;

    let is_creator = space.4.map(|c| c == auth.0.sub).unwrap_or(false);

    Ok(Json(SpaceInfo {
        id: space.0,
        code: space.1,
        name: space.2,
        is_public: space.3,
        is_creator,
        is_finished: space.5,
        ban_kicked_users: space.6,
    }))
}

pub async fn update_space(
    State(state): State<AppState>,
    auth: Auth,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSpaceRequest>,
) -> Result<Json<SpaceInfo>, (StatusCode, String)> {
    // Verify user belongs to this space
    if auth.0.space_id != id {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    // Check if user is creator
    let creator_id = sqlx::query_scalar::<_, Option<Uuid>>(
        "SELECT creator_id FROM spaces WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if creator_id != Some(auth.0.sub) {
        return Err((StatusCode::FORBIDDEN, "Only the creator can edit the space".to_string()));
    }

    // Update space name
    let space = sqlx::query_as::<_, (Uuid, String, String, bool, bool, bool)>(
        "UPDATE spaces SET name = $1, last_activity = NOW() WHERE id = $2 RETURNING id, code, name, is_public, is_finished, ban_kicked_users"
    )
    .bind(&req.name)
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(SpaceInfo {
        id: space.0,
        code: space.1,
        name: space.2,
        is_public: space.3,
        is_creator: true,
        is_finished: space.4,
        ban_kicked_users: space.5,
    }))
}

pub async fn delete_space(
    State(state): State<AppState>,
    auth: Auth,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    // Verify user belongs to this space
    if auth.0.space_id != id {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    // Check if user is creator
    let creator_id = sqlx::query_scalar::<_, Option<Uuid>>(
        "SELECT creator_id FROM spaces WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if creator_id != Some(auth.0.sub) {
        return Err((StatusCode::FORBIDDEN, "Only the creator can finish the space".to_string()));
    }

    // Mark space as finished instead of deleting
    sqlx::query("UPDATE spaces SET is_finished = TRUE WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn get_space_users(
    State(state): State<AppState>,
    auth: Auth,
    Path(space_id): Path<Uuid>,
) -> Result<Json<Vec<SpaceUser>>, (StatusCode, String)> {
    // Verify user belongs to this space
    if auth.0.space_id != space_id {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    // Get creator_id for this space
    let creator_id = sqlx::query_scalar::<_, Option<Uuid>>(
        "SELECT creator_id FROM spaces WHERE id = $1"
    )
    .bind(space_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Get all users in the space
    let users = sqlx::query_as::<_, (Uuid, String, bool, chrono::DateTime<chrono::Utc>)>(
        r#"
        SELECT id, nickname, is_kicked, joined_at
        FROM space_users
        WHERE space_id = $1
        ORDER BY joined_at ASC
        "#
    )
    .bind(space_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(
        users
            .into_iter()
            .map(|row| SpaceUser {
                id: row.0,
                nickname: row.1,
                is_creator: creator_id == Some(row.0),
                is_kicked: row.2,
                joined_at: row.3,
            })
            .collect(),
    ))
}

pub async fn kick_user(
    State(state): State<AppState>,
    auth: Auth,
    Path((space_id, user_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, (StatusCode, String)> {
    // Verify user belongs to this space
    if auth.0.space_id != space_id {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    // Check if current user is the creator
    let creator_id = sqlx::query_scalar::<_, Option<Uuid>>(
        "SELECT creator_id FROM spaces WHERE id = $1"
    )
    .bind(space_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if creator_id != Some(auth.0.sub) {
        return Err((StatusCode::FORBIDDEN, "Only the creator can kick users".to_string()));
    }

    // Can't kick yourself
    if user_id == auth.0.sub {
        return Err((StatusCode::BAD_REQUEST, "Cannot kick yourself".to_string()));
    }

    // Verify user exists in this space
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM space_users WHERE id = $1 AND space_id = $2)"
    )
    .bind(user_id)
    .bind(space_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !exists {
        return Err((StatusCode::NOT_FOUND, "User not found in this space".to_string()));
    }

    // Mark user as kicked
    sqlx::query("UPDATE space_users SET is_kicked = true, kicked_at = NOW() WHERE id = $1 AND space_id = $2")
        .bind(user_id)
        .bind(space_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn update_ban_setting(
    State(state): State<AppState>,
    auth: Auth,
    Path(space_id): Path<Uuid>,
    Json(req): Json<UpdateBanSettingRequest>,
) -> Result<Json<SpaceInfo>, (StatusCode, String)> {
    // Verify user belongs to this space
    if auth.0.space_id != space_id {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    // Check if user is creator
    let creator_id = sqlx::query_scalar::<_, Option<Uuid>>(
        "SELECT creator_id FROM spaces WHERE id = $1"
    )
    .bind(space_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if creator_id != Some(auth.0.sub) {
        return Err((StatusCode::FORBIDDEN, "Only the creator can change this setting".to_string()));
    }

    // Update ban_kicked_users setting
    let space = sqlx::query_as::<_, (Uuid, String, String, bool, bool, bool)>(
        "UPDATE spaces SET ban_kicked_users = $1 WHERE id = $2 RETURNING id, code, name, is_public, is_finished, ban_kicked_users"
    )
    .bind(req.ban_kicked_users)
    .bind(space_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(SpaceInfo {
        id: space.0,
        code: space.1,
        name: space.2,
        is_public: space.3,
        is_creator: true,
        is_finished: space.4,
        ban_kicked_users: space.5,
    }))
}
