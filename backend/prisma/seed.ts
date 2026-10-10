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

async function seedAgents() {
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
}

async function seedTools() {
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
}

async function seedProviders() {
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

  for (const provider of providers) {
    await prisma.provider.upsert({
      where: {
        id: provider.id,
      },

      update: {},

      create: provider,
    });
  }
}

async function seedWorkflows() {
  const workflowId =
    "workflow-research-report";

  await prisma.workflow.upsert({
    where: {
      id: workflowId,
    },

    update: {
      name:
        "Research & Report",

      description:
        "사용자 요청을 분석하고 조사, 분석, 작성, 검토 과정을 거쳐 최종 보고서를 생성합니다.",
    },

    create: {
      id:
        workflowId,

      name:
        "Research & Report",

      description:
        "사용자 요청을 분석하고 조사, 분석, 작성, 검토 과정을 거쳐 최종 보고서를 생성합니다.",
    },
  });

  await prisma.workflowEdge.deleteMany({
    where: {
      workflowId,
    },
  });

  await prisma.workflowNode.deleteMany({
    where: {
      workflowId,
    },
  });

  const nodes = [
    {
      workflowId,

      nodeId: "input",

      type: "input",

      name: "User Input",

      description:
        "사용자의 작업 목표를 입력받습니다.",

      positionX: 0,

      positionY: 180,

      agentId: null,

      modelId: null,

      toolIds:
        JSON.stringify([]),

      config:
        JSON.stringify({}),
    },

    {
      workflowId,

      nodeId: "planner",

      type: "agent",

      name: "Planning",

      description:
        "사용자 요청을 분석하고 실행 계획을 생성합니다.",

      positionX: 260,

      positionY: 180,

      agentId:
        "planner-agent",

      modelId:
        "gpt-4o",

      toolIds:
        JSON.stringify([]),

      config:
        JSON.stringify({
          retryCount: 1,
          timeoutSeconds: 300,
          requireApproval: false,
        }),
    },

    {
      workflowId,

      nodeId: "web-research",

      type: "agent",

      name: "Web Research",

      description:
        "웹에서 필요한 정보를 조사합니다.",

      positionX: 540,

      positionY: 80,

      agentId:
        "research-agent",

      modelId:
        "claude-3-5-sonnet",

      toolIds:
        JSON.stringify([
          "web-search",
          "browser",
        ]),

      config:
        JSON.stringify({
          retryCount: 2,
          timeoutSeconds: 600,
          requireApproval: false,
        }),
    },

    {
      workflowId,

      nodeId:
        "document-research",

      type: "agent",

      name:
        "Document Research",

      description:
        "문서에서 필요한 정보를 수집합니다.",

      positionX: 540,

      positionY: 300,

      agentId:
        "research-agent",

      modelId:
        "claude-3-5-sonnet",

      toolIds:
        JSON.stringify([
          "document-parser",
        ]),

      config:
        JSON.stringify({
          retryCount: 2,
          timeoutSeconds: 600,
          requireApproval: false,
        }),
    },

    {
      workflowId,

      nodeId: "analysis",

      type: "agent",

      name: "Analysis",

      description:
        "수집된 정보를 종합하고 분석합니다.",

      positionX: 830,

      positionY: 180,

      agentId:
        "analysis-agent",

      modelId:
        "gemini-2-5-pro",

      toolIds:
        JSON.stringify([]),

      config:
        JSON.stringify({
          retryCount: 1,
          timeoutSeconds: 600,
          requireApproval: false,
        }),
    },

    {
      workflowId,

      nodeId: "writer",

      type: "agent",

      name: "Report Writer",

      description:
        "분석 결과를 바탕으로 보고서 초안을 작성합니다.",

      positionX: 1100,

      positionY: 180,

      agentId:
        "writer-agent",

      modelId:
        "gpt-4o",

      toolIds:
        JSON.stringify([
          "file-tool",
        ]),

      config:
        JSON.stringify({
          retryCount: 1,
          timeoutSeconds: 600,
          requireApproval: true,
        }),
    },

    {
      workflowId,

      nodeId: "reviewer",

      type: "agent",

      name: "Review",

      description:
        "작성된 보고서를 검토하고 개선합니다.",

      positionX: 1380,

      positionY: 180,

      agentId:
        "reviewer-agent",

      modelId:
        "gpt-4o",

      toolIds:
        JSON.stringify([]),

      config:
        JSON.stringify({
          retryCount: 1,
          timeoutSeconds: 300,
          requireApproval: false,
        }),
    },

    {
      workflowId,

      nodeId: "output",

      type: "output",

      name: "Final Output",

      description:
        "최종 결과물을 반환합니다.",

      positionX: 1650,

      positionY: 180,

      agentId: null,

      modelId: null,

      toolIds:
        JSON.stringify([]),

      config:
        JSON.stringify({}),
    },
  ];

  await prisma.workflowNode.createMany({
    data: nodes,
  });

  const edges = [
    {
      workflowId,

      edgeId:
        "edge-input-planner",

      source: "input",

      target: "planner",

      sourceHandle: null,

      targetHandle: null,

      condition: null,
    },

    {
      workflowId,

      edgeId:
        "edge-planner-web",

      source: "planner",

      target:
        "web-research",

      sourceHandle: null,

      targetHandle: null,

      condition: null,
    },

    {
      workflowId,

      edgeId:
        "edge-planner-document",

      source: "planner",

      target:
        "document-research",

      sourceHandle: null,

      targetHandle: null,

      condition: null,
    },

    {
      workflowId,

      edgeId:
        "edge-web-analysis",

      source:
        "web-research",

      target: "analysis",

      sourceHandle: null,

      targetHandle: null,

      condition: null,
    },

    {
      workflowId,

      edgeId:
        "edge-document-analysis",

      source:
        "document-research",

      target: "analysis",

      sourceHandle: null,

      targetHandle: null,

      condition: null,
    },

    {
      workflowId,

      edgeId:
        "edge-analysis-writer",

      source: "analysis",

      target: "writer",

      sourceHandle: null,

      targetHandle: null,

      condition: null,
    },

    {
      workflowId,

      edgeId:
        "edge-writer-reviewer",

      source: "writer",

      target: "reviewer",

      sourceHandle: null,

      targetHandle: null,

      condition: null,
    },

    {
      workflowId,

      edgeId:
        "edge-reviewer-output",

      source: "reviewer",

      target: "output",

      sourceHandle: null,

      targetHandle: null,

      condition: null,
    },
  ];

  await prisma.workflowEdge.createMany({
    data: edges,
  });
}

async function main() {
  await seedAgents();
  await seedTools();
  await seedProviders();
  await seedWorkflows();

  console.log(
    "Agent / Tool / Provider / Workflow seed 완료",
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