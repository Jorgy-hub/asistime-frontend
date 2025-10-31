use rust_socketio::Payload;
use serde::de::DeserializeOwned;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

fn try_from_value<T>(v: serde_json::Value, handle: &AppHandle, emit_name: &str)
where
  T: DeserializeOwned + Serialize + std::fmt::Debug + Send + 'static,
{
  match serde_json::from_value::<T>(v) {
    Ok(data) => {
      let _ = handle.emit(emit_name, &data);
      println!("[socket] emitted {emit_name} {:?}", data);
    }
    Err(e) => println!("[socket] parse error {emit_name}: {e}"),
  }
}

#[allow(deprecated)] // only this legacy path uses Payload::String
fn handle_legacy_string<T>(payload: Payload, handle: &AppHandle, emit_name: &str)
where
  T: DeserializeOwned + Serialize + std::fmt::Debug + Send + 'static,
{
  if let Payload::String(s) = payload {
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(&s) {
      if v.is_array() {
        if let Some(first) = v.as_array().and_then(|a| a.get(0)).cloned() {
          try_from_value::<T>(first, handle, emit_name);
        }
      } else {
        try_from_value::<T>(v, handle, emit_name);
      }
    }
  }
}

pub fn parse_and_emit<T>(payload: Payload, handle: &AppHandle, emit_name: &str)
where
  T: DeserializeOwned + Serialize + std::fmt::Debug + Send + 'static,
{
  match payload {
    Payload::Text(values) => {
      if let Some(first) = values.get(0) {
        try_from_value::<T>(first.clone(), handle, emit_name);
      }
    }
    Payload::Binary(bin) => {
      if let Ok(txt) = std::str::from_utf8(&bin) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(txt) {
          if v.is_array() {
            if let Some(first) = v.as_array().and_then(|a| a.get(0)).cloned() {
              try_from_value::<T>(first, handle, emit_name);
            }
          } else {
            try_from_value::<T>(v, handle, emit_name);
          }
        }
      }
    }
    // Any other (legacy) variant, handled with an allowed-deprecated path
    other => handle_legacy_string::<T>(other, handle, emit_name),
  }
}