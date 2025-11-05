use serde::{Deserialize, Serialize};
use serde_json::json;
use serde_json::Value;
use std::time::Duration;
use once_cell::sync::Lazy;

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
