use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::auth::Auth;
use crate::models::*;
use crate::state::AppState;

pub async fn shot(
    State(state): State<AppState>,
    auth: Auth,
    Json(req): Json<ShotRequest>,
) -> Result<Json<ShotResponse>, (StatusCode, String)> {
    // Check if user is kicked
    let is_kicked = sqlx::query_scalar::<_, bool>(
        "SELECT is_kicked FROM space_users WHERE id = $1 AND space_id = $2"
    )
    .bind(auth.0.sub)
    .bind(auth.0.space_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if is_kicked {
        return Err((StatusCode::FORBIDDEN, "You have been kicked from this space".to_string()));
    }

    // Check if space is finished
    let is_finished = sqlx::query_scalar::<_, bool>(
        "SELECT is_finished FROM spaces WHERE id = $1"
    )
    .bind(auth.0.space_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if is_finished {
        return Err((StatusCode::FORBIDDEN, "This space has been finished".to_string()));
    }

    let id = sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO shots (space_id, user_id, content, show_nickname) VALUES ($1, $2, $3, $4) RETURNING id"
    )
    .bind(auth.0.space_id)
    .bind(auth.0.sub)
    .bind(&req.content)
    .bind(req.show_nickname)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Update last activity
    sqlx::query("UPDATE spaces SET last_activity = NOW() WHERE id = $1")
        .bind(auth.0.space_id)
        .execute(&state.db)
        .await
        .ok();

    Ok(Json(ShotResponse { id }))
}

pub async fn get_shots(
    State(state): State<AppState>,
    auth: Auth,
    Path(space_id): Path<Uuid>,
) -> Result<Json<Vec<Shot>>, (StatusCode, String)> {
    // Verify user belongs to this space
    if auth.0.space_id != space_id {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    // Update last activity
    sqlx::query("UPDATE spaces SET last_activity = NOW() WHERE id = $1")
        .bind(space_id)
        .execute(&state.db)
        .await
        .ok();

    // Check if space is private/finished and if user is kicked
    let space_info = sqlx::query_as::<_, (bool, bool, bool)>(
        "SELECT is_public, is_finished, ban_kicked_users FROM spaces WHERE id = $1"
    )
    .bind(space_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let user_kick_info = sqlx::query_as::<_, (bool, Option<DateTime<Utc>>)>(
        "SELECT is_kicked, kicked_at FROM space_users WHERE id = $1 AND space_id = $2"
    )
    .bind(auth.0.sub)
    .bind(space_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let is_public = space_info.0;
    let is_finished = space_info.1;
    let ban_kicked_users = space_info.2;
    let is_kicked = user_kick_info.0;
    let kicked_at = user_kick_info.1;

    // Determine if we should filter messages:
    // - Public space: kicked users always see all messages (spectator mode)
    // - Private space + ban_kicked_users ON: always filter to messages before kick time
    // - Private space + ban_kicked_users OFF + active: filter to messages before kick time
    // - Private space + ban_kicked_users OFF + finished: show all messages (spectator mode)
    let should_filter = !is_public && is_kicked && kicked_at.is_some() && (ban_kicked_users || !is_finished);

    let shots = if should_filter {
        sqlx::query_as::<_, (Uuid, Uuid, String, String, DateTime<Utc>, bool, bool)>(
            r#"
            SELECT sh.id, sh.user_id, su.nickname, sh.content, sh.sent_at, sh.show_nickname, su.is_kicked
            FROM shots sh
            JOIN space_users su ON sh.user_id = su.id
            WHERE sh.space_id = $1 AND sh.sent_at <= $2
            ORDER BY sh.sent_at ASC
            "#
        )
        .bind(space_id)
        .bind(kicked_at.unwrap())
        .fetch_all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        sqlx::query_as::<_, (Uuid, Uuid, String, String, DateTime<Utc>, bool, bool)>(
            r#"
            SELECT sh.id, sh.user_id, su.nickname, sh.content, sh.sent_at, sh.show_nickname, su.is_kicked
            FROM shots sh
            JOIN space_users su ON sh.user_id = su.id
            WHERE sh.space_id = $1
            ORDER BY sh.sent_at ASC
            "#
        )
        .bind(space_id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    };

    Ok(Json(
        shots
            .into_iter()
            .map(|row| Shot {
                id: row.0,
                user_id: row.1,
                nickname: if row.5 { Some(row.2) } else { None },
                content: row.3,
                sent_at: row.4,
                // Only show kicked status for non-anonymous messages to preserve anonymity
                is_kicked: if row.5 { row.6 } else { false },
            })
            .collect(),
    ))
}
