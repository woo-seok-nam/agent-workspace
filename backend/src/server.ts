import type {
  Server,
} from "node:http";

import {
  app,
} from "./app.js";

import {
  env,
} from "./config/env.js";

import {
  checkpointRunningWorkflowRuns,
  recoverInterruptedWorkflowRuns,
} from "./orchestrator/recovery.service.js";

let server:
  Server | undefined;

let shuttingDown =
  false;

async function startServer() {
  /*
   * STEP 45
   *
   * HTTP Server가 요청을 받기 전에
   * 이전 Backend 프로세스에서 중단된 Workflow를
   * 먼저 안전한 상태로 복구한다.
   */
  try {
    console.log(
      "[Recovery] 중단된 Workflow Run을 확인합니다...",
    );

    const recoveryResult =
      await recoverInterruptedWorkflowRuns();

    console.log(
      `[Recovery] 확인한 Run: ${recoveryResult.inspectedRuns}`,
    );

    console.log(
      `[Recovery] 복구된 Run: ${recoveryResult.recoveredRuns}`,
    );

    console.log(
      `[Recovery] 복구된 Step: ${recoveryResult.recoveredSteps}`,
    );

    if (
      recoveryResult.failedRunIds.length >
      0
    ) {
      console.warn(
        `[Recovery] 복구에 실패한 Run: ${recoveryResult.failedRunIds.join(
          ", ",
        )}`,
      );
    }
  } catch (
    error
  ) {
    /*
     * 전체 Recovery 조회 자체가 실패하더라도
     * Backend 실행 자체를 차단하지 않는다.
     *
     * 문제는 로그로 남기고 서버는 실행한다.
     */
    console.error(
      "[Recovery] Workflow Recovery 과정에서 오류가 발생했습니다.",
      error,
    );
  }

  server =
    app.listen(
      env.port,
      () => {
        console.log(
          "",
        );

        console.log(
          "======================================",
        );

        console.log(
          " Agent Workspace Backend",
        );

        console.log(
          "======================================",
        );

        console.log(
          `Server: http://localhost:${env.port}`,
        );

        console.log(
          `Health: http://localhost:${env.port}/api/health`,
        );

        console.log(
          `Frontend: ${env.frontendUrl}`,
        );

        console.log(
          `Environment: ${env.nodeEnv}`,
        );

        console.log(
          "======================================",
        );

        console.log(
          "",
        );
      },
    );
}

/*
 * HTTP Server가 더 이상 신규 요청을 받지 않도록 한다.
 *
 * 기존 연결이 모두 끝나면 Promise가 resolve된다.
 */
function closeServer(
  currentServer: Server,
) {
  return new Promise<void>(
    (
      resolve,
    ) => {
      currentServer.close(
        () => {
          resolve();
        },
      );
    },
  );
}

/*
 * Graceful Shutdown이 무한정 기다리지 않도록
 * 최대 대기 시간을 둔다.
 *
 * Workflow Checkpoint는 그 전에 DB에 저장되므로
 * timeout 후 프로세스를 종료해도
 * 다음 실행 시 Resume 가능한 상태가 유지된다.
 */
function waitForShutdownTimeout(
  milliseconds: number,
) {
  return new Promise<void>(
    (
      resolve,
    ) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

async function shutdown(
  signal: string,
) {
  /*
   * SIGINT / SIGTERM이 연속으로 들어와도
   * Shutdown Logic은 한 번만 실행한다.
   */
  if (
    shuttingDown
  ) {
    return;
  }

  shuttingDown =
    true;

  console.log(
    "",
  );

  console.log(
    `[Shutdown] ${signal} 신호를 받았습니다.`,
  );

  const currentServer =
    server;

  /*
   * 먼저 신규 HTTP 요청 수신을 중단한다.
   */
  const serverClosePromise =
    currentServer
      ? closeServer(
          currentServer,
        )
      : Promise.resolve();

  /*
   * STEP 45
   *
   * Orchestrator에서 실행 중인 Run을
   * 안전한 PAUSED Checkpoint 상태로 저장한다.
   *
   * STEP 44에서 Orchestrator가 PAUSED를
   * Cooperative Control 신호로 인식하므로,
   * 현재 Provider 요청이 끝난 뒤에도
   * 결과를 COMPLETED로 덮어쓰지 않는다.
   */
  try {
    console.log(
      "[Shutdown] 실행 중인 Workflow를 Checkpoint 처리합니다...",
    );

    const checkpointResult =
      await checkpointRunningWorkflowRuns();

    console.log(
      `[Shutdown] 확인한 Run: ${checkpointResult.inspectedRuns}`,
    );

    console.log(
      `[Shutdown] Checkpoint Run: ${checkpointResult.recoveredRuns}`,
    );

    console.log(
      `[Shutdown] Checkpoint Step: ${checkpointResult.recoveredSteps}`,
    );

    if (
      checkpointResult.failedRunIds.length >
      0
    ) {
      console.warn(
        `[Shutdown] Checkpoint에 실패한 Run: ${checkpointResult.failedRunIds.join(
          ", ",
        )}`,
      );
    }
  } catch (
    error
  ) {
    console.error(
      "[Shutdown] Workflow Checkpoint 과정에서 오류가 발생했습니다.",
      error,
    );
  }

  /*
   * 기존 HTTP 요청이 정상 종료되는 것을 기다린다.
   *
   * 다만 Provider 요청 등의 이유로 너무 오래 걸리면
   * 10초 후 프로세스를 종료한다.
   */
  await Promise.race([
    serverClosePromise,

    waitForShutdownTimeout(
      10_000,
    ),
  ]);

  console.log(
    "[Shutdown] Backend 서버를 종료합니다.",
  );

  process.exit(
    0,
  );
}

process.on(
  "SIGINT",
  () => {
    void shutdown(
      "SIGINT",
    );
  },
);

process.on(
  "SIGTERM",
  () => {
    void shutdown(
      "SIGTERM",
    );
  },
);

void startServer();