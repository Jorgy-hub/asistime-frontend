#[tauri::command]
pub async fn login(username: String, password: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .post("http://localhost:1420/auth/login")
        .json(&serde_json::json!({
            "username": username,
            "password": password
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    println!("Username: {}", username);
    println!("Response status: {}", response.status());

    if response.status().is_success() {
        let login_response: LoginResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        println!("Access token: {}", login_response.access_token);
        Ok(login_response.access_token)
    } else {
        let error_message = response
            .text()
            .await
            .map_err(|e| format!("Failed to parse error response: {}", e))?;
        Err(format!("Login failed: {}", error_message))
    }
}

#[tauri::command]
pub async fn get_user(auth_token: &str) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let response = client
        .get("http://localhost:1420/auth/profile")
        .bearer_auth(auth_token)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    println!("Response status: {}", response.status());

    if response.status().is_success() {
        let user_data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
        println!("User data: {:?}", user_data);
        Ok(user_data)
    } else {
        let error_message = response
            .text()
            .await
            .map_err(|e| format!("Failed to parse error response: {}", e))?;
        println!("Error fetching user data: {}", error_message);
        Err(format!("Failed to fetch user data: {}", error_message))
    }
}

#[derive(serde::Deserialize)]
struct LoginResponse {
    access_token: String,
}
