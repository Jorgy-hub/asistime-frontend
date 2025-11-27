mod parse;
mod registry;
pub mod types;

use rust_socketio::ClientBuilder;
use std::time::Duration;
use tauri::AppHandle;

use registry::build_with_registered_events;

static API_BASE: Lazy<String> = Lazy::new(|| {
    std::env::var("API_BASE_URL").unwrap_or_else(|_| "http://85.239.243.19:1420".to_string())
});

pub fn spawn_socket_thread(handle: AppHandle) {
    std::thread::spawn(move || {
        let url = std::env::var("SOCKET_URL").unwrap_or_else(|_| "http://85.239.243.19:1420".to_string());
        let namespace = "/";
        println!("[socket] connecting to {url} ns={namespace}");

        let builder = ClientBuilder::new(&url)
            .namespace(namespace)
            .reconnect(true)
            .on("connect", |_p, _| println!("[socket] connected"))
            .on("disconnect", |_p, _| println!("[socket] disconnected"))
            .on("error", |p, _| println!("[socket][error] {:?}", p))
            .on_any(|ev, payload, _| {
                println!("[socket][any] {ev} {:?}", payload);
            });

        let builder = build_with_registered_events(builder, &handle);

        match builder.connect() {
            Ok(_c) => {
                println!("[socket] waiting for events...");
                loop {
                    std::thread::sleep(Duration::from_secs(3600));
                }
            }
            Err(e) => eprintln!("[socket] connection error: {e:?}"),
        }
    });
}
