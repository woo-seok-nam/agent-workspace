use std::{io::{Read, Write}, process::{Command, Stdio}, sync::atomic::{AtomicBool, Ordering}, time::{Duration, Instant}};
static BUSY: AtomicBool = AtomicBool::new(false);
struct BusyGuard;
impl Drop for BusyGuard { fn drop(&mut self) { BUSY.store(false, Ordering::SeqCst); } }

#[tauri::command]
pub async fn agent_task(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    if BUSY.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_err() {
        return Err("이미 AI 작업이 실행 중입니다.".into());
    }
    let guard = BusyGuard;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        call_runtime(payload)
    }).await.map_err(|_| "Runtime 작업 처리에 실패했습니다.".to_string())?
}
fn call_runtime(payload: serde_json::Value) -> Result<serde_json::Value, String> {
    let body = serde_json::to_vec(&payload).map_err(|_| "요청 형식 오류")?;
    if body.len() > 1_000_000 { return Err("입력 자료가 너무 큽니다.".into()); }
    // Development integration: source tree is required; no packaged installer yet.
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../agent-runtime");
    let node = std::env::var_os("AGENT_NODE_PATH").unwrap_or_else(|| "node".into());
    let mut command = Command::new(node);
    command.current_dir(root)
        .args(["--env-file-if-exists=.env", "--import", "tsx", "src/task/desktop-cli.ts"])
        .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null());
    #[cfg(windows)] {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let mut child = command.spawn().map_err(|_| "Node 24 설치와 agent-runtime 의존성 설치를 확인하세요.".to_string())?;
    let stdout = child.stdout.take().ok_or("Runtime 출력 연결 실패")?;
    let reader = std::thread::spawn(move || {
        let mut data = Vec::new();
        stdout.take(8_000_001).read_to_end(&mut data).map(|_| data)
    });
    let write_result = child.stdin.take().ok_or("Runtime 입력 연결 실패")?.write_all(&body);
    if write_result.is_err() {
        let _ = child.kill(); let _ = child.wait(); let _ = reader.join();
        return Err("Runtime 시작 실패: Node 24와 npm ci 설치를 확인하세요.".into());
    }
    let deadline = Instant::now() + Duration::from_secs(345);
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) if Instant::now() < deadline => std::thread::sleep(Duration::from_millis(100)),
            _ => {
                let _ = child.kill(); let _ = child.wait(); let _ = reader.join();
                return Err("Runtime 시간 초과 또는 프로세스 오류입니다. 저장 기록을 확인하세요.".into());
            }
        }
    }
    let bytes = reader.join().map_err(|_| "Runtime 출력 읽기 실패")?
        .map_err(|_| "Runtime 출력 읽기 실패")?;
    if bytes.len() > 8_000_000 { return Err("Runtime 응답 크기 제한 초과".into()); }
    serde_json::from_slice(&bytes).map_err(|_| "Runtime 응답 오류: Node 24와 agent-runtime 의존성을 확인하세요.".into())
}
