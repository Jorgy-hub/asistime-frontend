use crate::socket::parse::parse_and_emit;
use crate::socket::types::*;
use rust_socketio::{ClientBuilder, Payload, RawClient}; // add RawClient
use tauri::AppHandle;

// Return a closure whose second param matches the crate's expected RawClient
fn handler<T>(handle: AppHandle, ev: &'static str) -> impl FnMut(Payload, RawClient) + 'static
where
    T: serde::de::DeserializeOwned + serde::Serialize + std::fmt::Debug + Send + 'static,
{
    move |payload, _raw_client| {
        parse_and_emit::<T>(payload, &handle, ev);
    }
}

macro_rules! register_events {
  ($builder:expr, $handle:expr, { $( $ev:literal => $ty:ty ),+ $(,)? }) => {{
    let mut b = $builder;
    $(
      let h = $handle.clone();
      b = b.on($ev, handler::<$ty>(h, $ev));
    )+
    b
  }};
}

pub fn build_with_registered_events(builder: ClientBuilder, handle: &AppHandle) -> ClientBuilder {
    register_events!(builder, handle, {
      "student:logged" => StudentLogged,
      "student:count_currently_inside" => StudentCountCurrentlyInside,
      "student:count_currently_outside" => StudentCountCurrentlyOutside,
    })
}
