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

pub async fn list_history_spaces(
    State(state): State<AppState>,
) -> Result<Json<Vec<HistorySpace>>, (StatusCode, String)> {
    let spaces = sqlx::query_as::<_, (Uuid, String, i64, bool)>(
        r#"
        SELECT s.id, s.name, COUNT(sh.id) as shot_count, s.is_public
        FROM spaces s
        LEFT JOIN shots sh ON s.id = sh.space_id
        WHERE s.is_public = true AND s.is_finished = true
        GROUP BY s.id
        ORDER BY s.last_activity DESC
        "#
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(
        spaces
            .into_iter()
            .map(|row| HistorySpace {
                id: row.0,
                name: row.1,
                shot_count: row.2,
                is_public: row.3,
            })
            .collect(),
    ))
}

pub async fn get_space_history(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<SpaceHistory>, (StatusCode, String)> {
    // Get space info - must be public and finished
    let space = sqlx::query_as::<_, (Uuid, String, bool, bool)>(
        "SELECT id, name, is_public, is_finished FROM spaces WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Space not found".to_string()))?;

    if !space.2 {
        return Err((StatusCode::FORBIDDEN, "This space is not public".to_string()));
    }

    if !space.3 {
        return Err((StatusCode::FORBIDDEN, "This space is not finished yet".to_string()));
    }

    // Get all shots
    let shots = sqlx::query_as::<_, (Uuid, Uuid, String, String, DateTime<Utc>, bool, bool)>(
        r#"
        SELECT sh.id, sh.user_id, su.nickname, sh.content, sh.sent_at, sh.show_nickname, su.is_kicked
        FROM shots sh
        JOIN space_users su ON sh.user_id = su.id
        WHERE sh.space_id = $1
        ORDER BY sh.sent_at ASC
        "#
    )
    .bind(id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(SpaceHistory {
        id: space.0,
        name: space.1,
        shots: shots
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
    }))
}

pub async fn get_my_space_history(
    State(state): State<AppState>,
    auth: Auth,
    Path(id): Path<Uuid>,
) -> Result<Json<SpaceHistory>, (StatusCode, String)> {
    // Check if user was involved in this space and get their kick info
    let user_info = sqlx::query_as::<_, (bool, Option<DateTime<Utc>>)>(
        "SELECT is_kicked, kicked_at FROM space_users WHERE id = $1 AND space_id = $2"
    )
    .bind(auth.0.sub)
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let user_info = user_info.ok_or((StatusCode::FORBIDDEN, "You were not a member of this space".to_string()))?;

    let is_kicked = user_info.0;
    let kicked_at = user_info.1;

    // Get space info - must be finished
    let space = sqlx::query_as::<_, (Uuid, String, bool, bool, bool)>(
        "SELECT id, name, is_finished, is_public, ban_kicked_users FROM spaces WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::NOT_FOUND, "Space not found".to_string()))?;

    if !space.2 {
        return Err((StatusCode::FORBIDDEN, "This space is not finished yet".to_string()));
    }

    let is_public = space.3;
    let ban_kicked_users = space.4;

    // For banned users in private spaces, filter messages to before kick time
    let should_filter = !is_public && is_kicked && ban_kicked_users && kicked_at.is_some();

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
        .bind(id)
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
        .bind(id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    };

    Ok(Json(SpaceHistory {
        id: space.0,
        name: space.1,
        shots: shots
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
    }))
}

pub async fn list_my_history_spaces(
    State(state): State<AppState>,
    auth: Auth,
) -> Result<Json<Vec<HistorySpace>>, (StatusCode, String)> {
    // Get all finished spaces the user was involved in
    let spaces = sqlx::query_as::<_, (Uuid, String, i64, bool)>(
        r#"
        SELECT s.id, s.name, COUNT(sh.id) as shot_count, s.is_public
        FROM spaces s
        INNER JOIN space_users su ON s.id = su.space_id
        LEFT JOIN shots sh ON s.id = sh.space_id
        WHERE s.is_finished = true AND su.id = $1
        GROUP BY s.id
        ORDER BY s.last_activity DESC
        "#
    )
    .bind(auth.0.sub)
    .fetch_all(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(
        spaces
            .into_iter()
            .map(|row| HistorySpace {
                id: row.0,
                name: row.1,
                shot_count: row.2,
                is_public: row.3,
            })
            .collect(),
    ))
}
