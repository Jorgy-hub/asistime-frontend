use reqwest;

#[tauri::command]
pub async fn health_check() -> Result<bool, String> {
    match reqwest::get("http://172.16.0.110:1420/health").await {
        Ok(resp) if resp.status().is_success() => Ok(true),
        Ok(resp) => Err(format!("Health check failed: status {}", resp.status())),
        Err(e) => Err(format!("Health check request error: {e}")),
    }
}
