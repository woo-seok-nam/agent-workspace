import {
  app,
} from "./app.js";

import {
  env,
} from "./config/env.js";

const server =
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

function shutdown(
  signal: string,
) {
  console.log(
    `${signal} 신호를 받았습니다.`,
  );

  server.close(
    () => {
      console.log(
        "Backend 서버를 종료합니다.",
      );

      process.exit(0);
    },
  );
}

process.on(
  "SIGINT",
  () =>
    shutdown(
      "SIGINT",
    ),
);

process.on(
  "SIGTERM",
  () =>
    shutdown(
      "SIGTERM",
    ),
);