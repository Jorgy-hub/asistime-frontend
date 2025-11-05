mod commands;
mod socket;

use commands::auth::{get_user, login};
use commands::health::health_check;
use commands::students::{
    student_detail, students_count_currently_inside, students_count_currently_outside,
    students_count_new, students_count_total, students_filter,
};
use commands::user::{create_user, delete_user, list_users, update_user};
use tauri_plugin_updater::UpdaterExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = dotenvy::dotenv();

    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            socket::spawn_socket_thread(app.handle().to_owned());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login,
            get_user,
            students_count_currently_inside,
            students_count_currently_outside,
            students_count_total,
            students_count_new,
            students_filter,
            student_detail,
            health_check,
            list_users,
            create_user,
            update_user,
            delete_user,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
