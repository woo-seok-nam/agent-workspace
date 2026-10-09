import "dotenv/config";

function getNumberEnv(
  name: string,
  fallback: number,
): number {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    throw new Error(
      `${name} 환경변수는 숫자여야 합니다.`,
    );
  }

  return parsedValue;
}

export const env = {
  port: getNumberEnv(
    "PORT",
    4000,
  ),

  nodeEnv:
    process.env.NODE_ENV ??
    "development",

  frontendUrl:
    process.env.FRONTEND_URL ??
    "http://localhost:5173",
};

export const isProduction =
  env.nodeEnv === "production";