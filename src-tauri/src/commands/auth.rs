use once_cell::sync::Lazy;

static API_BASE: Lazy<String> = Lazy::new(|| {
    std::env::var("API_BASE_URL").unwrap_or_else(|_| "http://172.16.0.110:1420".to_string())
});

#[tauri::command]
pub async fn login(username: String, password: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/auth/login", *API_BASE))
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
        .get(format!("{}/auth/profile", *API_BASE))
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
