use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentLogged {
    #[serde(rename = "schoolId")]
    pub school_id: String,
    pub id: String,
    pub name: String,
    pub at: i64,
    pub exit: bool,
    pub accepted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentCountCurrentlyInside {
    #[serde(rename = "schoolId")]
    pub school_id: String,
    pub count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentCountCurrentlyOutside {
    #[serde(rename = "schoolId")]
    pub school_id: String,
    pub count: u32,
}
