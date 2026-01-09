mod auth;
mod handlers;
mod models;
mod state;

use axum::{
    extract::DefaultBodyLimit,
    routing::{delete, get, patch, post},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

use handlers::{history, shots, spaces, users};
use state::AppState;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/anonymspace".to_string());

    let jwt_secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "your-secret-key-change-in-production".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    let state = AppState {
        db: pool.clone(),
        jwt_secret: Arc::new(jwt_secret),
    };

    // Spawn cleanup task for inactive spaces
    let cleanup_pool = pool.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
            // Delete spaces without auto_finish that are inactive for 5 minutes
            let _ = sqlx::query("DELETE FROM spaces WHERE last_activity < NOW() - INTERVAL '5 minutes' AND is_finished = false AND auto_finish_minutes IS NULL")
                .execute(&cleanup_pool)
                .await;
            // Auto-finish spaces based on their auto_finish_minutes setting
            let _ = sqlx::query("UPDATE spaces SET is_finished = true WHERE is_finished = false AND auto_finish_minutes IS NOT NULL AND last_activity < NOW() - (auto_finish_minutes || ' minutes')::INTERVAL")
                .execute(&cleanup_pool)
                .await;
        }
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        // Auth routes
        .route("/auth/register", post(users::register))
        .route("/auth/login", post(users::login))
        .route("/auth/profile", get(users::get_profile).patch(users::update_profile))
        .route("/auth/password", post(users::change_password))
        .route("/auth/sessions", get(users::list_sessions))
        .route("/auth/sessions/{id}", delete(users::revoke_session))
        .route("/auth/account", delete(users::delete_account))
        // Public routes
        .route("/space", post(spaces::create_space))
        .route("/space/public", get(spaces::list_public_spaces))
        .route("/space/history", get(history::list_history_spaces))
        .route("/space/{id}/history", get(history::get_space_history))
        .route("/space/{id}/my-history", get(history::get_my_space_history))
        .route("/involve", post(spaces::involve).delete(spaces::leave_space))
        // Protected routes
        .route("/space/{id}", get(spaces::get_space).patch(spaces::update_space).delete(spaces::delete_space))
        .route("/space/{id}/shots", get(shots::get_shots))
        .route("/space/{id}/users", get(spaces::get_space_users))
        .route("/space/{id}/kick/{user_id}", post(spaces::kick_user))
        .route("/space/{id}/ban-setting", patch(spaces::update_ban_setting))
        .route("/space/my-history", get(history::list_my_history_spaces))
        .route("/shot", post(shots::shot))
        .layer(cors)
        .layer(DefaultBodyLimit::max(30 * 1024 * 1024)) // 30MB limit for avatar uploads
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await.unwrap();
    println!("Server running on http://0.0.0.0:3001");
    axum::serve(listener, app).await.unwrap();
}
