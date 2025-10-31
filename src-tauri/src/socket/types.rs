use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentLogged {
  pub id: String,
  pub name: String,
  pub at: i64,
  pub exit: bool,
  pub accepted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentCountCurrentlyInside {
  pub count: u32
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentCountCurrentlyOutside {
  pub count: u32
}
