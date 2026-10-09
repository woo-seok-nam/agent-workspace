import "dotenv/config";

import {
  PrismaBetterSqlite3,
} from "@prisma/adapter-better-sqlite3";

import {
  PrismaClient,
} from "../src/generated/prisma/client.js";

const databaseUrl =
  process.env.DATABASE_URL ??
  "file:./dev.db";

const adapter =
  new PrismaBetterSqlite3({
    url: databaseUrl,
  });

const prisma =
  new PrismaClient({
    adapter,
  });

async function main() {
  const agents = [
    {
      id: "planner-agent",

      name: "Planner Agent",

      description:
        "사용자 요청을 분석하고 Workflow 실행 계획을 수립합니다.",

      modelId: "gpt-4o",

      toolIds:
        JSON.stringify([]),

      enabled: true,
    },

    {
      id: "research-agent",

      name: "Research Agent",

      description:
        "웹과 문서를 조사하여 필요한 정보를 수집합니다.",

      modelId:
        "claude-3-5-sonnet",

      toolIds:
        JSON.stringify([
          "web-search",
          "browser",
        ]),

      enabled: true,
    },

    {
      id: "analysis-agent",

      name: "Analysis Agent",

      description:
        "수집된 정보를 분석하고 핵심 인사이트를 추출합니다.",

      modelId:
        "gemini-2-5-pro",

      toolIds:
        JSON.stringify([]),

      enabled: true,
    },

    {
      id: "writer-agent",

      name: "Writer Agent",

      description:
        "분석 결과를 문서 형태로 작성합니다.",

      modelId: "gpt-4o",

      toolIds:
        JSON.stringify([
          "file-tool",
        ]),

      enabled: true,
    },

    {
      id: "reviewer-agent",

      name: "Reviewer Agent",

      description:
        "생성된 결과를 검토하고 개선점을 확인합니다.",

      modelId: "gpt-4o",

      toolIds:
        JSON.stringify([]),

      enabled: true,
    },
  ];

  for (const agent of agents) {
    await prisma.agent.upsert({
      where: {
        id: agent.id,
      },

      update: {},

      create: agent,
    });
  }

  console.log(
    "Agent seed 완료",
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);

    await prisma.$disconnect();

    process.exit(1);
  });