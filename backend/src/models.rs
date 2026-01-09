use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// Space types
#[derive(Deserialize)]
pub struct CreateSpaceRequest {
    pub name: String,
    pub is_public: bool,
    pub creator_nickname: String,
    pub auto_finish_minutes: Option<i32>,
}

#[derive(Serialize)]
pub struct CreateSpaceResponse {
    pub token: String,
    pub user_id: Uuid,
    pub space_id: Uuid,
    pub code: String,
    pub name: String,
    pub is_public: bool,
    pub is_creator: bool,
}

#[derive(Deserialize)]
pub struct InvolveRequest {
    pub code: String,
    pub nickname: String,
}

#[derive(Serialize)]
pub struct InvolveResponse {
    pub token: String,
    pub user_id: Uuid,
    pub space_id: Uuid,
    pub space_name: String,
    pub nickname: String,
    pub is_creator: bool,
}

#[derive(Serialize)]
pub struct PublicSpace {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub member_count: i64,
}

#[derive(Serialize)]
pub struct SpaceInfo {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub is_public: bool,
    pub is_creator: bool,
    pub is_finished: bool,
    pub ban_kicked_users: bool,
}

#[derive(Deserialize)]
pub struct UpdateSpaceRequest {
    pub name: String,
}

#[derive(Deserialize)]
pub struct UpdateBanSettingRequest {
    pub ban_kicked_users: bool,
}

// Shot types
#[derive(Deserialize)]
pub struct ShotRequest {
    pub content: String,
    pub show_nickname: bool,
}

#[derive(Serialize)]
pub struct ShotResponse {
    pub id: Uuid,
}

#[derive(Serialize)]
pub struct Shot {
    pub id: Uuid,
    pub user_id: Uuid,
    pub nickname: Option<String>,
    pub content: String,
    pub sent_at: DateTime<Utc>,
    pub is_kicked: bool,
}

// History types
#[derive(Serialize)]
pub struct HistorySpace {
    pub id: Uuid,
    pub name: String,
    pub shot_count: i64,
    pub is_public: bool,
}

#[derive(Serialize)]
pub struct SpaceHistory {
    pub id: Uuid,
    pub name: String,
    pub shots: Vec<Shot>,
}

// Space user types
#[derive(Serialize)]
pub struct SpaceUser {
    pub id: Uuid,
    pub nickname: String,
    pub is_creator: bool,
    pub is_kicked: bool,
    pub joined_at: DateTime<Utc>,
}

// Auth types
#[derive(Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user_id: Uuid,
    pub username: String,
}

// Profile types
#[derive(Serialize)]
pub struct UserProfile {
    pub id: Uuid,
    pub username: String,
    pub nickname: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize)]
pub struct UpdateProfileRequest {
    pub nickname: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Serialize)]
pub struct UserSession {
    pub id: Uuid,
    pub device_name: Option<String>,
    pub created_at: DateTime<Utc>,
    pub last_active: DateTime<Utc>,
    pub is_current: bool,
}
