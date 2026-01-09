use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::auth::{create_auth_token, hash_token, UserAuth};
use crate::models::*;
use crate::state::AppState;

pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    // Validate input
    let username = req.username.trim();
    if username.len() < 3 || username.len() > 50 {
        return Err((StatusCode::BAD_REQUEST, "Username must be 3-50 characters".to_string()));
    }
    if req.password.len() < 6 {
        return Err((StatusCode::BAD_REQUEST, "Password must be at least 6 characters".to_string()));
    }

    // Hash password
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2
        .hash_password(req.password.as_bytes(), &salt)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Failed to hash password".to_string()))?
        .to_string();

    // Insert user
    let user_id = sqlx::query_scalar::<_, Uuid>(
        "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id"
    )
    .bind(username)
    .bind(&password_hash)
    .fetch_one(&state.db)
    .await
    .map_err(|e| {
        if e.to_string().contains("duplicate") || e.to_string().contains("unique") {
            (StatusCode::CONFLICT, "Username already taken".to_string())
        } else {
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        }
    })?;

    // Generate token
    let token = create_auth_token(user_id, username, &state.jwt_secret)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Create session
    let token_hash = hash_token(&token);
    sqlx::query("INSERT INTO user_sessions (user_id, token_hash, device_name) VALUES ($1, $2, $3)")
        .bind(user_id)
        .bind(&token_hash)
        .bind("Web Browser")
        .execute(&state.db)
        .await
        .ok();

    Ok(Json(AuthResponse {
        token,
        user_id,
        username: username.to_string(),
    }))
}

pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    // Find user by username (check not deleted)
    let user = sqlx::query_as::<_, (Uuid, String, String, bool)>(
        "SELECT id, username, password_hash, is_deleted FROM users WHERE username = $1"
    )
    .bind(&req.username)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::UNAUTHORIZED, "Invalid credentials".to_string()))?;

    if user.3 {
        return Err((StatusCode::UNAUTHORIZED, "This account has been deleted".to_string()));
    }

    // Verify password
    let parsed_hash = PasswordHash::new(&user.2)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Invalid hash".to_string()))?;

    Argon2::default()
        .verify_password(req.password.as_bytes(), &parsed_hash)
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid credentials".to_string()))?;

    // Generate token
    let token = create_auth_token(user.0, &user.1, &state.jwt_secret)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Create session
    let token_hash = hash_token(&token);
    sqlx::query("INSERT INTO user_sessions (user_id, token_hash, device_name) VALUES ($1, $2, $3)")
        .bind(user.0)
        .bind(&token_hash)
        .bind("Web Browser")
        .execute(&state.db)
        .await
        .ok();

    Ok(Json(AuthResponse {
        token,
        user_id: user.0,
        username: user.1,
    }))
}

pub async fn get_profile(
    State(state): State<AppState>,
    auth: UserAuth,
) -> Result<Json<UserProfile>, (StatusCode, String)> {
    let user = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>)>(
        "SELECT id, username, nickname, avatar_url FROM users WHERE id = $1"
    )
    .bind(auth.user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Update session last_active
    let token_hash = hash_token(&auth.token);
    sqlx::query("UPDATE user_sessions SET last_active = NOW() WHERE token_hash = $1")
        .bind(&token_hash)
        .execute(&state.db)
        .await
        .ok();

    Ok(Json(UserProfile {
        id: user.0,
        username: user.1,
        nickname: user.2,
        avatar_url: user.3,
    }))
}

pub async fn update_profile(
    State(state): State<AppState>,
    auth: UserAuth,
    Json(req): Json<UpdateProfileRequest>,
) -> Result<Json<UserProfile>, (StatusCode, String)> {
    // Update nickname if provided
    if let Some(ref nickname) = req.nickname {
        let nickname = nickname.trim();
        if nickname.len() > 50 {
            return Err((StatusCode::BAD_REQUEST, "Nickname must be 50 characters or less".to_string()));
        }
        sqlx::query("UPDATE users SET nickname = $1 WHERE id = $2")
            .bind(if nickname.is_empty() { None } else { Some(nickname) })
            .bind(auth.user_id)
            .execute(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // Update avatar if provided
    if let Some(ref avatar_url) = req.avatar_url {
        sqlx::query("UPDATE users SET avatar_url = $1 WHERE id = $2")
            .bind(if avatar_url.is_empty() { None } else { Some(avatar_url) })
            .bind(auth.user_id)
            .execute(&state.db)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    // Return updated profile
    let user = sqlx::query_as::<_, (Uuid, String, Option<String>, Option<String>)>(
        "SELECT id, username, nickname, avatar_url FROM users WHERE id = $1"
    )
    .bind(auth.user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(UserProfile {
        id: user.0,
        username: user.1,
        nickname: user.2,
        avatar_url: user.3,
    }))
}

pub async fn change_password(
    State(state): State<AppState>,
    auth: UserAuth,
    Json(req): Json<ChangePasswordRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    if req.new_password.len() < 6 {
        return Err((StatusCode::BAD_REQUEST, "New password must be at least 6 characters".to_string()));
    }

    // Get current password hash
    let current_hash = sqlx::query_scalar::<_, String>(
        "SELECT password_hash FROM users WHERE id = $1"
    )
    .bind(auth.user_id)
    .fetch_one(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Verify current password
    let parsed_hash = PasswordHash::new(&current_hash)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Invalid hash".to_string()))?;

    Argon2::default()
        .verify_password(req.current_password.as_bytes(), &parsed_hash)
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Current password is incorrect".to_string()))?;

    // Hash new password
    let salt = SaltString::generate(&mut OsRng);
    let new_hash = Argon2::default()
        .hash_password(req.new_password.as_bytes(), &salt)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Failed to hash password".to_string()))?
        .to_string();

    // Update password
    sqlx::query("UPDATE users SET password_hash = $1 WHERE id = $2")
        .bind(&new_hash)
        .bind(auth.user_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_sessions(
    State(state): State<AppState>,
    auth: UserAuth,
) -> Result<Json<Vec<UserSession>>, (StatusCode, String)> {
    let current_token_hash = hash_token(&auth.token);

    let sessions = sqlx::query_as::<_, (Uuid, Option<String>, chrono::DateTime<chrono::Utc>, chrono::DateTime<chrono::Utc>, String)>(
        "SELECT id, device_name, created_at, last_active, token_hash FROM user_sessions WHERE user_id = $1 ORDER BY last_active DESC"
    )
    .bind(auth.user_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(
        sessions
            .into_iter()
            .map(|s| UserSession {
                id: s.0,
                device_name: s.1,
                created_at: s.2,
                last_active: s.3,
                is_current: s.4 == current_token_hash,
            })
            .collect(),
    ))
}

pub async fn revoke_session(
    State(state): State<AppState>,
    auth: UserAuth,
    Path(session_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    // Delete session (only if it belongs to this user)
    let result = sqlx::query("DELETE FROM user_sessions WHERE id = $1 AND user_id = $2")
        .bind(session_id)
        .bind(auth.user_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if result.rows_affected() == 0 {
        return Err((StatusCode::NOT_FOUND, "Session not found".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_account(
    State(state): State<AppState>,
    auth: UserAuth,
) -> Result<StatusCode, (StatusCode, String)> {
    // Mark user as deleted
    sqlx::query("UPDATE users SET is_deleted = true WHERE id = $1")
        .bind(auth.user_id)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Remove user from all active spaces (delete their space_users entries)
    sqlx::query("DELETE FROM space_users WHERE auth_user_id = $1")
        .bind(auth.user_id)
        .execute(&state.db)
        .await
        .ok();

    // Delete all sessions
    sqlx::query("DELETE FROM user_sessions WHERE user_id = $1")
        .bind(auth.user_id)
        .execute(&state.db)
        .await
        .ok();

    Ok(StatusCode::NO_CONTENT)
}
