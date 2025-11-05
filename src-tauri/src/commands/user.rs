use serde::{Deserialize, Serialize};
use serde_json::json;
use once_cell::sync::Lazy;

static API_BASE: Lazy<String> = Lazy::new(|| {
    std::env::var("API_BASE_URL").unwrap_or_else(|_| "http://172.16.0.110:1420".to_string())
});

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub username: String,
    pub password: String,
    pub admin: bool,
    pub refresh_token: Option<String>,
    pub permissions: Vec<String>,
}

#[tauri::command]
pub async fn list_users() -> Result<Vec<User>, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/user/all", *API_BASE))
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    let users = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(users)
}

#[tauri::command]
pub async fn create_user(user: User) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/auth/register", *API_BASE))
        .json(&user)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!(
            "Failed to create user: {}",
            response.text().await.unwrap_or_default()
        ))
    }
}

#[tauri::command]
pub async fn update_user(user: User) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/auth/update", *API_BASE))
        .json(&user)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!(
            "Failed to update user: {}",
            response.text().await.unwrap_or_default()
        ))
    }
}

#[tauri::command]
pub async fn delete_user(username: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/auth/delete", *API_BASE))
        .json(&json!({ "username": username }))
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!(
            "Failed to delete user: {}",
            response.text().await.unwrap_or_default()
        ))
    }
}
