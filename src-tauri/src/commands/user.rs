use serde::{Deserialize, Serialize};
use serde_json::json;

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
        .get("http://172.16.0.110:1420/user/all")
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;           
    let users = response.json().await.map_err(|e| format!("Failed to parse response: {}", e))?;
    
    Ok(users)
}

#[tauri::command]
pub async fn create_user(user: User) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .post("http://172.16.0.110:1420/auth/register")
        .json(&user)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!("Failed to create user: {}", response.text().await.unwrap_or_default()))
    }
}

#[tauri::command]
pub async fn update_user(user: User) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .post("http://172.16.0.110:1420/auth/update")
        .json(&user)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    
    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!("Failed to update user: {}", response.text().await.unwrap_or_default()))
    }
}

#[tauri::command]
pub async fn delete_user(username: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .post("http://172.16.0.110:1420/auth/delete")
        .json(&json!({ "username": username }))
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;
    if response.status().is_success() {
        Ok(())
    } else {
        Err(format!("Failed to delete user: {}", response.text().await.unwrap_or_default()))
    }
}