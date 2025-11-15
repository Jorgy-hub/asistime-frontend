use serde::{Deserialize, Serialize};
use serde_json::json;
use serde_json::Value;
use std::time::Duration;
use once_cell::sync::Lazy;
use std::io::Write;
use dirs_next;
use tauri::Emitter;
use reqwest;
use reqwest::multipart;
use base64::{engine::general_purpose, Engine as _};

static API_BASE: Lazy<String> = Lazy::new(|| {
    std::env::var("API_BASE_URL").unwrap_or_else(|_| "http://172.16.0.110:1420".to_string())
});

#[tauri::command]
pub async fn students_count_currently_inside() -> Result<usize, String> {
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(format!("{}/students/countCurrentlyInside", *API_BASE))
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?
        .error_for_status()
        .map_err(|e| format!("HTTP error: {e}"))?;

    // Read once, then try JSON number or plain text number.
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    if let Ok(n) = serde_json::from_slice::<usize>(&bytes) {
        return Ok(n);
    }

    let s = std::str::from_utf8(&bytes).unwrap_or("").trim();
    s.parse::<usize>()
        .map_err(|e| format!("Invalid number: {e}"))
}

#[tauri::command]
pub async fn students_count_currently_outside() -> Result<usize, String> {
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(format!("{}/students/countCurrentlyOutside", *API_BASE))
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?
        .error_for_status()
        .map_err(|e| format!("HTTP error: {e}"))?;

    // Read once, then try JSON number or plain text number.
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    if let Ok(n) = serde_json::from_slice::<usize>(&bytes) {
        return Ok(n);
    }
    let s = std::str::from_utf8(&bytes).unwrap_or("").trim();
    s.parse::<usize>()
        .map_err(|e| format!("Invalid number: {e}"))
}

#[tauri::command]
pub async fn students_count_total() -> Result<usize, String> {
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(format!("{}/students/countTotalStudents", *API_BASE))
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?
        .error_for_status()
        .map_err(|e| format!("HTTP error: {e}"))?;

    // Read once, then try JSON number or plain text number.
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    if let Ok(n) = serde_json::from_slice::<usize>(&bytes) {
        return Ok(n);
    }

    let s = std::str::from_utf8(&bytes).unwrap_or("").trim();
    s.parse::<usize>()
        .map_err(|e| format!("Invalid number: {e}"))
}

#[tauri::command]
pub async fn students_count_new() -> Result<usize, String> {
    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(format!("{}/students/countNewStudents", *API_BASE))
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?
        .error_for_status()
        .map_err(|e| format!("HTTP error: {e}"))?;

    // Read once, then try JSON number or plain text number.
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    if let Ok(n) = serde_json::from_slice::<usize>(&bytes) {
        return Ok(n);
    }

    let s = std::str::from_utf8(&bytes).unwrap_or("").trim();
    s.parse::<usize>()
        .map_err(|e| format!("Invalid number: {e}"))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntranceLog {
    pub at: i64,
    pub exit: bool,
    pub accepted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Report {
    pub reason: String,
    pub at: i64,
    pub reported_by: String,
    pub due_date: i64,
    pub suspended: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Student {
    pub id: String,
    pub name: String,
    pub career: Option<String>,
    pub prev_semester: Option<String>,
    pub semester: Option<String>,
    pub gender: Option<String>,
    pub age: Option<String>,
    pub shift: Option<String>,
    pub prev_group: Option<String>,
    pub group: Option<String>,
    pub logs: Vec<EntranceLog>,
    pub reports: Option<Vec<Report>>,
}

#[derive(Deserialize)]
struct GqlError {
    message: String,
}

#[derive(Deserialize)]
struct StudentsFilterData {
    #[serde(rename = "studentsFilter")]
    students_filter: Vec<Student>,
}

#[derive(Deserialize)]
struct GqlResp {
    data: StudentsFilterData,
    #[serde(default)]
    errors: Option<Vec<GqlError>>,
}

#[tauri::command]
pub async fn students_filter(
    name: Option<String>,
    id: Option<String>,
    group: Option<String>,
    semester: Option<String>,
    career: Option<String>,
    shift: Option<String>,
) -> Result<Vec<Student>, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let query = r#"
      query StudentsFilter($name: String, $id: String, $group: String, $semester: String, $career: String, $shift: String) {
        studentsFilter(name: $name, id: $id, group: $group, semester: $semester, career: $career, shift: $shift) {
          id
          name
          career
          prev_semester
          semester
          gender
          age
          shift
          prev_group
          group
          logs { at exit accepted }
        }
      }
    "#;

    let variables = json!({
        "name": name,
        "id": id,
        "group": group,
        "semester": semester,
        "career": career,
        "shift": shift,
    });

    let resp = client
        .post(format!("{}/graphql", *API_BASE))
        .json(&json!({ "query": query, "variables": variables }))
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?
        .error_for_status()
        .map_err(|e| format!("HTTP error: {e}"))?;

    let gql: GqlResp = resp
        .json()
        .await
        .map_err(|e| format!("Invalid JSON: {e}"))?;
    if let Some(errs) = gql.errors {
        if let Some(first) = errs.first() {
            return Err(first.message.clone());
        }
    }
    Ok(gql.data.students_filter)
}

#[derive(Deserialize)]
struct StudentByIdData {
    student: Option<Student>,
}

#[derive(Deserialize)]
struct GqlRespStudent {
    data: StudentByIdData,
    #[serde(default)]
    errors: Option<Vec<GqlError>>,
}

#[tauri::command]
pub async fn student_detail(id: String) -> Result<Student, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let query = r#"
      query Student($id: String!) {
        student(id: $id) {
          id
          name
          career
          prev_semester
          semester
          gender
          age
          shift
          prev_group
          group 
          logs { at exit accepted }
          reports { reason at reported_by due_date suspended }
        }
      }
    "#;

    let variables = json!({ "id": id });

    let resp = client
        .post(format!("{}/graphql", *API_BASE))
        .json(&json!({ "query": query, "variables": variables }))
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    let status = resp.status();
    let body = resp
        .text()
        .await
        .map_err(|e| format!("Read body error: {e}"))?;
    println!("[student_detail] HTTP {} body: {}", status, body);

    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status.as_u16(), body));
    }

    // Extract GraphQL errors for readable message
    if let Ok(val) = serde_json::from_str::<Value>(&body) {
        if let Some(errors) = val.get("errors").and_then(|e| e.as_array()) {
            if !errors.is_empty() {
                let msg = errors
                    .iter()
                    .filter_map(|e| e.get("message").and_then(|m| m.as_str()))
                    .collect::<Vec<_>>()
                    .join(" | ");
                return Err(if msg.is_empty() {
                    "GraphQL error".into()
                } else {
                    msg
                });
            }
        }
    }

    // Parse typed data
    let gql: GqlRespStudent =
        serde_json::from_str(&body).map_err(|e| format!("Invalid JSON: {e}: {body}"))?;
    match gql.data.student {
        Some(s) => Ok(s),
        None => Err("Student not found".to_string()),
    }
}


// Student report management commands
// ------------------------------------------------------------------------------
#[tauri::command]
pub async fn student_report_create(id: String, report: Report) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/students/addReport", *API_BASE);
    let resp = client
        .post(&url)
        .json(&json!({
            "id": id,
            "report": report,
        }))
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?
        .error_for_status()
        .map_err(|e| format!("HTTP error: {e}"))?;

    let status = resp.status();
    let body = resp
        .text()
        .await
        .map_err(|e| format!("Read body error: {e}"))?;
    println!("[student_report_create] HTTP {} body: {}", status, body);

    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status.as_u16(), body));
    }

    Ok(())
}

#[tauri::command]
pub async fn student_report_delete(id: String, at: i64) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;  
    let url = format!("{}/students/deleteReport", *API_BASE);
    let resp = client
        .post(&url)
        .json(&json!({
            "id": id,
            "at": at,
        }))
        .send()
        .await  
        .map_err(|e| format!("Network error: {e}"))?
        .error_for_status()
        .map_err(|e| format!("HTTP error: {e}"))?;
    Ok(()) 
}

#[tauri::command]
pub async fn student_report_update(id: String, at: i64, report: Report) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/students/updateReport", *API_BASE);
    let resp = client
        .post(&url)
        .json(&json!({
            "id": id,
            "at": at,
            "report": report,
        }))
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?
        .error_for_status()
        .map_err(|e| format!("HTTP error: {e}"))?;

    let status = resp.status();
    let body = resp
        .text()
        .await
        .map_err(|e| format!("Read body error: {e}"))?;
    println!("[student_report_update] HTTP {} body: {}", status, body);

    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status.as_u16(), body));
    }

    Ok(())
}


#[derive(Deserialize)]
pub struct StudentBrief {
    pub id: String,
    pub name: Option<String>,
}

fn safe_name(s: &str) -> String {
    s.chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect()
}

// Generates QR codes for the given students and packages them into a ZIP file.
#[tauri::command]
pub async fn qr_zip_generate(
    window: tauri::Window,                // to emit progress events
    base_url: String,
    students: Vec<StudentBrief>,
    fmt: String,
    size: u32,
) -> Result<String, String> {
    use image::{DynamicImage, ImageBuffer, ImageOutputFormat, Luma};
    use qrcode::{EcLevel, QrCode};
    use std::fs::File;
    use std::path::PathBuf;
    use zip::{write::FileOptions, CompressionMethod, ZipWriter};

    if students.is_empty() {
        return Err("No students provided".into());
    }

    let downloads = dirs_next::download_dir()
        .or_else(|| dirs_next::home_dir().map(|h| h.join("Downloads")))
        .ok_or("Downloads directory not found")?;

    let ts = chrono::Local::now().format("%Y%m%d-%H%M%S").to_string();
    let mut out_path = PathBuf::from(downloads);
    out_path.push(format!("Asistime-QRCodes-{}.zip", ts));

    let file = File::create(&out_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(CompressionMethod::Stored)
        .unix_permissions(0o644);

    let is_svg = fmt.to_lowercase() == "svg";
    let sfx = if is_svg { "svg" } else { "png" };

    let total = students.len();
    // Signal start
    let _ = window.emit(
        "qr_zip_progress",
        json!({ "status": "start", "current": 0, "total": total }),
    );

    for (idx, s) in students.into_iter().enumerate() {
        let url = format!(
            "{}/{}",
            base_url.trim_end_matches('/'),
            s.id.trim_start_matches('/')
        );
        let name_part = s.name.as_deref().unwrap_or("");
        let file_name = format!("{}.{}", safe_name(&s.id), sfx);

        let code = QrCode::with_error_correction_level(url.as_bytes(), EcLevel::M)
            .map_err(|e| e.to_string())?;

        if is_svg {
            let svg = code
                .render()
                .min_dimensions(size, size)
                .dark_color(qrcode::render::svg::Color("#000"))
                .light_color(qrcode::render::svg::Color("#fff"))
                .build();
            zip.start_file(&file_name, options).map_err(|e| e.to_string())?;
            zip.write_all(svg.as_bytes()).map_err(|e| e.to_string())?;
        } else {
            let img: ImageBuffer<Luma<u8>, Vec<u8>> =
                code.render::<Luma<u8>>().min_dimensions(size, size).build();
            let mut buf = Vec::new();
            let dyn_img = DynamicImage::ImageLuma8(img);
            dyn_img
                .write_to(&mut std::io::Cursor::new(&mut buf), ImageOutputFormat::Png)
                .map_err(|e| e.to_string())?;
            zip.start_file(&file_name, options).map_err(|e| e.to_string())?;
            zip.write_all(&buf).map_err(|e| e.to_string())?;
        }

        // Progress (1-based)
        let _ = window.emit(
            "qr_zip_progress",
            json!({ "status": "progress", "current": idx + 1, "total": total }),
        );
    }

    zip.finish().map_err(|e| e.to_string())?;

    // Done
    let _ = window.emit(
        "qr_zip_progress",
        json!({ "status": "done", "current": total, "total": total, "path": out_path }),
    );

    Ok(out_path.to_string_lossy().to_string())
}

// Summary returned by backend
#[derive(Serialize, Deserialize)]
pub struct ImportSummary {
    pub inserted: Option<u32>,
    pub updated: Option<u32>,
    pub deleted: Option<u32>,
    pub totalIncoming: Option<u32>,
}

// Helper to POST a single Excel file (base64) to an endpoint
async fn post_excel(
    endpoint: &str,
    excel_b64: String,
    filename: &str,
) -> Result<ImportSummary, String> {
    let bytes = general_purpose::STANDARD
        .decode(excel_b64)
        .map_err(|e| format!("Base64 decode error: {e}"))?;

    let part = multipart::Part::bytes(bytes)
        .file_name(filename.to_string())
        .mime_str("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .map_err(|e| e.to_string())?;

    let form = multipart::Form::new().part("file", part);

    let url = format!("{}/students/import/{}", *API_BASE, endpoint);

    let client = reqwest::Client::new();
    let resp = client
        .post(url)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;

    let status = resp.status();
    let text = resp.text().await.map_err(|e| format!("Read error: {e}"))?;

    if !status.is_success() {
        return Err(format!("HTTP {}: {}", status.as_u16(), text));
    }

    // Parse JSON
    let parsed: Value =
        serde_json::from_str(&text).map_err(|e| format!("JSON parse error: {e}"))?;

    // Map dynamic JSON to ImportSummary (defensive)
    let summary = ImportSummary {
        inserted: parsed.get("inserted").and_then(|v| v.as_u64()).map(|v| v as u32),
        updated: parsed.get("updated").and_then(|v| v.as_u64()).map(|v| v as u32),
        deleted: parsed.get("deleted").and_then(|v| v.as_u64()).map(|v| v as u32),
        totalIncoming: parsed
            .get("totalIncoming")
            .and_then(|v| v.as_u64())
            .map(|v| v as u32),
    };

    Ok(summary)
}

#[tauri::command]
pub async fn students_import_new(excel_base64: String) -> Result<ImportSummary, String> {
    post_excel("new", excel_base64, "new_students.xlsx").await
}

#[tauri::command]
pub async fn students_import_update(excel_base64: String) -> Result<ImportSummary, String> {
    post_excel("update", excel_base64, "update_students.xlsx").await
}