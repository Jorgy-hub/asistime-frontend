use reqwest;
use reqwest::Client;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::json;

static API_BASE: Lazy<String> = Lazy::new(|| {
    std::env::var("API_BASE_URL").unwrap_or_else(|_| "http://85.239.243.19:1420".to_string())
});

#[tauri::command]
pub async fn health_check() -> Result<bool, String> {
    match reqwest::get(format!("{}/health", *API_BASE)).await {
        Ok(resp) if resp.status().is_success() => Ok(true),
        Ok(resp) => Err(format!("Health check failed: status {}", resp.status())),
        Err(e) => Err(format!("Health check request error: {e}")),
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppUriResp {
    pub redirect_uri: String,
}

#[tauri::command]
pub async fn app_get_uri(id: String) -> Result<String, String> {
    let url = format!("{}/getUri?id={}", *API_BASE, id);
    let client = Client::new();
    let resp = client.get(url).send().await.map_err(|e| format!("Network: {e}"))?;
    let status = resp.status();
    let body = resp.text().await.map_err(|e| format!("Read body: {e}"))?;
    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status.as_u16(), body));
    }
    let parsed: AppUriResp = serde_json::from_str(&body).map_err(|e| format!("JSON: {e}: {body}"))?;
    Ok(parsed.redirect_uri)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateAppClassDto {
    pub id: String,
    pub new_redirect_uri: String,
}

#[tauri::command]
pub async fn app_update_uri(id: String, newRedirectUri: String) -> Result<(), String> {
    let url = format!("{}/updateUri", *API_BASE);
    let client = Client::new();
    let payload = json!({ "id": id, "new_redirect_uri": newRedirectUri });
    let resp = client
        .post(url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network: {e}"))?;
    let status = resp.status();
    let body = resp.text().await.map_err(|e| format!("Read body: {e}"))?;
    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status.as_u16(), body));
    }
    Ok(())
}