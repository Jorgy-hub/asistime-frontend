use reqwest;
use once_cell::sync::Lazy;

static API_BASE: Lazy<String> = Lazy::new(|| {
    std::env::var("API_BASE_URL").unwrap_or_else(|_| "http://172.16.0.110:1420".to_string())
});

#[tauri::command]
pub async fn health_check() -> Result<bool, String> {
    match reqwest::get(format!("{}/health", *API_BASE)).await {
        Ok(resp) if resp.status().is_success() => Ok(true),
        Ok(resp) => Err(format!("Health check failed: status {}", resp.status())),
        Err(e) => Err(format!("Health check request error: {e}")),
    }
}
