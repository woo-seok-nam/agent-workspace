mod reception;
mod agent_task;

pub fn register_commands<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.invoke_handler(tauri::generate_handler![reception::receive_user_input, agent_task::agent_task])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    register_commands(tauri::Builder::default())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
