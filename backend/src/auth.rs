use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    RequestPartsExt,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::state::{AppState, FromRef};

// Space JWT claims (for space-specific auth)
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,        // user_id (space_users.id)
    pub space_id: Uuid,
    pub nickname: String,
    pub exp: i64,
}

// User JWT claims (for global auth)
#[derive(Debug, Serialize, Deserialize)]
pub struct AuthClaims {
    pub sub: Uuid,  // user id from users table
    pub username: String,
    pub exp: i64,
}

// Space auth extractor
pub struct Auth(pub Claims);

impl<S> FromRequestParts<S> for Auth
where
    S: Send + Sync,
    AppState: FromRef<S>,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| (StatusCode::UNAUTHORIZED, "Missing authorization header".to_string()))?;

        let app_state = AppState::from_ref(state);

        let token_data = decode::<Claims>(
            bearer.token(),
            &DecodingKey::from_secret(app_state.jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))?;

        Ok(Auth(token_data.claims))
    }
}

// User auth extractor (for authenticated user endpoints)
#[allow(dead_code)]
pub struct UserAuth {
    pub user_id: Uuid,
    pub username: String,
    pub token: String,
}

impl<S> FromRequestParts<S> for UserAuth
where
    S: Send + Sync,
    AppState: FromRef<S>,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| (StatusCode::UNAUTHORIZED, "Missing authorization header".to_string()))?;

        let app_state = AppState::from_ref(state);
        let token = bearer.token().to_string();

        let token_data = decode::<AuthClaims>(
            &token,
            &DecodingKey::from_secret(app_state.jwt_secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))?;

        // Check if user is deleted
        let is_deleted = sqlx::query_scalar::<_, bool>(
            "SELECT is_deleted FROM users WHERE id = $1"
        )
        .bind(token_data.claims.sub)
        .fetch_optional(&app_state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string()))?
        .unwrap_or(true);

        if is_deleted {
            return Err((StatusCode::UNAUTHORIZED, "Account has been deleted".to_string()));
        }

        // Check if session is still valid (not revoked)
        let token_hash = hash_token(&token);
        let session_exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM user_sessions WHERE token_hash = $1 AND user_id = $2)"
        )
        .bind(&token_hash)
        .bind(token_data.claims.sub)
        .fetch_one(&app_state.db)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string()))?;

        if !session_exists {
            return Err((StatusCode::UNAUTHORIZED, "Session has been revoked".to_string()));
        }

        Ok(UserAuth {
            user_id: token_data.claims.sub,
            username: token_data.claims.username,
            token,
        })
    }
}

// Token creation for space auth
pub fn create_token(user_id: Uuid, space_id: Uuid, nickname: &str, secret: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let expiration = Utc::now() + Duration::days(30);
    let claims = Claims {
        sub: user_id,
        space_id,
        nickname: nickname.to_string(),
        exp: expiration.timestamp(),
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

// Token creation for user auth
pub fn create_auth_token(user_id: Uuid, username: &str, secret: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let expiration = Utc::now() + Duration::days(30);
    let claims = AuthClaims {
        sub: user_id,
        username: username.to_string(),
        exp: expiration.timestamp(),
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

// Hash token for storage (simple hash for session tracking)
pub fn hash_token(token: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    token.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}
