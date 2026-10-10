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

  const tools = [
    {
      id: "web-search",
      name: "Web Search",
      description:
        "웹에서 최신 정보를 검색합니다.",
      type: "web_search",
      enabled: true,
    },

    {
      id: "browser",
      name: "Browser",
      description:
        "웹페이지를 탐색합니다.",
      type: "browser",
      enabled: true,
    },

    {
      id: "document-parser",
      name: "Document Parser",
      description:
        "문서 파일의 내용을 읽고 분석합니다.",
      type: "document_parser",
      enabled: true,
    },

    {
      id: "file-tool",
      name: "File Writer",
      description:
        "생성된 결과를 파일 형태로 저장합니다.",
      type: "file",
      enabled: true,
    },

    {
      id: "api-request",
      name: "API Request",
      description:
        "외부 API를 호출합니다.",
      type: "api",
      enabled: true,
    },

    {
      id: "code-execution",
      name: "Code Execution",
      description:
        "코드를 실행하고 결과를 반환합니다.",
      type: "code",
      enabled: true,
    },
  ];

  for (const tool of tools) {
    await prisma.tool.upsert({
      where: {
        id: tool.id,
      },

      update: {},

      create: tool,
    });
  }

  const providers = [
    {
      id: "openai",
      name: "OpenAI",
      description:
        "GPT 계열 모델을 사용하는 AI Provider입니다.",
      enabled: true,
      connectionStatus:
        "not_configured",
    },

    {
      id: "anthropic",
      name: "Anthropic",
      description:
        "Claude 계열 모델을 사용하는 AI Provider입니다.",
      enabled: true,
      connectionStatus:
        "not_configured",
    },

    {
      id: "google",
      name: "Google",
      description:
        "Gemini 계열 모델을 사용하는 AI Provider입니다.",
      enabled: true,
      connectionStatus:
        "not_configured",
    },

    {
      id: "local",
      name: "Local Model",
      description:
        "로컬 환경에서 실행되는 AI 모델을 연결합니다.",
      enabled: false,
      connectionStatus:
        "not_configured",
    },
  ];

  for (
    const provider of providers
  ) {
    await prisma.provider.upsert({
      where: {
        id: provider.id,
      },

      update: {},

      create: provider,
    });
  }

  console.log(
    "Agent / Tool / Provider seed 완료",
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