import {
  getAgent,
} from "../modules/agents/agent.service.js";

import type {
  ExecutionLog,
  StepRun,
  WorkflowRun,
} from "../modules/runs/run.types.js";

import {
  getRun,
} from "../modules/runs/run.service.js";

import {
  getTools,
} from "../modules/tools/tool.service.js";

import type {
  Tool,
} from "../modules/tools/tool.types.js";

import {
  getWorkflow,
} from "../modules/workflows/workflow.service.js";

import type {
  Workflow,
  WorkflowNode,
} from "../modules/workflows/workflow.types.js";

import {
  evaluateExecutionPolicy,
} from "../policy/policy.service.js";

import type {
  ExecutionTraceStep,
  TracePolicyDecision,
  TraceRiskLevel,
  WorkflowExecutionTrace,
} from "./observability.types.js";

function calculateDurationMs(
  startedAt?: string,
  completedAt?: string,
) {
  if (!startedAt) {
    return undefined;
  }

  const start =
    new Date(
      startedAt,
    ).getTime();

  const end =
    completedAt
      ? new Date(
          completedAt,
        ).getTime()
      : Date.now();

  if (
    Number.isNaN(
      start,
    ) ||
    Number.isNaN(
      end,
    )
  ) {
    return undefined;
  }

  return Math.max(
    0,
    end - start,
  );
}

function countRetryLogs(
  logs: ExecutionLog[],
) {
  return logs.filter(
    (log) => {
      const message =
        log.message.toLowerCase();

      return (
        message.includes(
          "재시도",
        ) ||
        message.includes(
          "다시 시도",
        )
      );
    },
  ).length;
}

function countRecoveryLogs(
  logs: ExecutionLog[],
) {
  return logs.filter(
    (log) => {
      const message =
        log.message.toLowerCase();

      return (
        message.includes(
          "supervisor",
        ) &&
        (
          message.includes(
            "recovery",
          ) ||
          message.includes(
            "복구",
          )
        )
      );
    },
  ).length;
}

function detectPolicyDecisionFromLogs(
  logs: ExecutionLog[],
): TracePolicyDecision {
  for (
    let index =
      logs.length - 1;
    index >= 0;
    index -= 1
  ) {
    const log =
      logs[index];

    if (!log) {
      continue;
    }

    const message =
      log.message.toUpperCase();

    if (
      message.includes(
        "POLICY",
      ) &&
      (
        message.includes(
          "차단",
        ) ||
        message.includes(
          "DENY",
        )
      )
    ) {
      return "DENY";
    }

    if (
      message.includes(
        "POLICY",
      ) &&
      (
        message.includes(
          "승인",
        ) ||
        message.includes(
          "REQUIRE_APPROVAL",
        )
      )
    ) {
      return "REQUIRE_APPROVAL";
    }

    if (
      message.includes(
        "POLICY",
      ) &&
      message.includes(
        "ALLOW",
      )
    ) {
      return "ALLOW";
    }
  }

  return "UNKNOWN";
}

function detectRiskLevelFromLogs(
  logs: ExecutionLog[],
): TraceRiskLevel {
  for (
    let index =
      logs.length - 1;
    index >= 0;
    index -= 1
  ) {
    const log =
      logs[index];

    if (!log) {
      continue;
    }

    const message =
      log.message.toUpperCase();

    if (
      message.includes(
        "CRITICAL",
      )
    ) {
      return "CRITICAL";
    }

    if (
      message.includes(
        "HIGH",
      )
    ) {
      return "HIGH";
    }

    if (
      message.includes(
        "MEDIUM",
      )
    ) {
      return "MEDIUM";
    }

    if (
      message.includes(
        "LOW",
      )
    ) {
      return "LOW";
    }
  }

  return "UNKNOWN";
}

function getPolicyTrace(
  node: WorkflowNode,
  tools: Tool[],
  logs: ExecutionLog[],
): {
  policyDecision: TracePolicyDecision;
  riskLevel: TraceRiskLevel;
} {
  const loggedDecision =
    detectPolicyDecisionFromLogs(
      logs,
    );

  const loggedRisk =
    detectRiskLevelFromLogs(
      logs,
    );

  /*
   * REQUIRE_APPROVAL / DENY처럼 실제 실행 당시
   * Policy 로그가 존재한다면 로그를 우선한다.
   *
   * 로그는 실제 실행 당시의 결과이기 때문이다.
   */
  if (
    loggedDecision !==
    "UNKNOWN"
  ) {
    return {
      policyDecision:
        loggedDecision,

      riskLevel:
        loggedRisk,
    };
  }

  /*
   * 정상 ALLOW 실행은 현재 별도 Policy 로그가
   * 없을 수 있으므로 같은 Policy Engine으로
   * 다시 평가해서 Trace 정보를 보완한다.
   */
  const evaluation =
    evaluateExecutionPolicy({
      node,

      tools,
    });

  return {
    policyDecision:
      evaluation.decision,

    riskLevel:
      evaluation.riskLevel,
  };
}

function resolveToolList(
  node: WorkflowNode,
  tools: Tool[],
) {
  const toolIds =
    node.toolIds ??
    [];

  return toolIds.map(
    (toolId) => {
      const tool =
        tools.find(
          (candidate) =>
            candidate.id ===
            toolId,
        );

      if (!tool) {
        return {
          id:
            toolId,

          name:
            "Unknown Tool",

          type:
            "unknown",

          enabled:
            false,
        };
      }

      return {
        id:
          tool.id,

        name:
          tool.name,

        type:
          tool.type,

        enabled:
          tool.enabled,
      };
    },
  );
}

async function buildStepTrace(
  stepRun: StepRun,
  workflow: Workflow,
  tools: Tool[],
): Promise<ExecutionTraceStep> {
  const node =
    workflow.nodes.find(
      (candidate) =>
        candidate.id ===
        stepRun.nodeId,
    );

  if (!node) {
    return {
      stepRunId:
        stepRun.id,

      nodeId:
        stepRun.nodeId,

      nodeName:
        "Unknown Node",

      nodeType:
        "agent",

      status:
        stepRun.status,

      approvalStatus:
        stepRun.approvalStatus,

      startedAt:
        stepRun.startedAt,

      completedAt:
        stepRun.completedAt,

      durationMs:
        calculateDurationMs(
          stepRun.startedAt,
          stepRun.completedAt,
        ),

      tools:
        [],

      retryCount:
        countRetryLogs(
          stepRun.logs,
        ),

      recoveryCount:
        countRecoveryLogs(
          stepRun.logs,
        ),

      policyDecision:
        "UNKNOWN",

      riskLevel:
        "UNKNOWN",

      tokenUsage:
        stepRun.tokenUsage,

      cost:
        stepRun.cost,

      logs:
        stepRun.logs,
    };
  }

  let agent:
    ExecutionTraceStep["agent"];

  if (
    node.agentId
  ) {
    const agentData =
      await getAgent(
        node.agentId,
      );

    if (
      agentData
    ) {
      agent = {
        id:
          agentData.id,

        name:
          agentData.name,

        modelId:
          node.modelId ??
          agentData.modelId,
      };
    }
  }

  const policyTrace =
    getPolicyTrace(
      node,
      tools,
      stepRun.logs,
    );

  return {
    stepRunId:
      stepRun.id,

    nodeId:
      node.id,

    nodeName:
      node.name,

    nodeType:
      node.type,

    status:
      stepRun.status,

    approvalStatus:
      stepRun.approvalStatus,

    startedAt:
      stepRun.startedAt,

    completedAt:
      stepRun.completedAt,

    durationMs:
      calculateDurationMs(
        stepRun.startedAt,
        stepRun.completedAt,
      ),

    agent,

    tools:
      resolveToolList(
        node,
        tools,
      ),

    retryCount:
      countRetryLogs(
        stepRun.logs,
      ),

    recoveryCount:
      countRecoveryLogs(
        stepRun.logs,
      ),

    policyDecision:
      policyTrace.policyDecision,

    riskLevel:
      policyTrace.riskLevel,

    tokenUsage:
      stepRun.tokenUsage,

    cost:
      stepRun.cost,

    logs:
      stepRun.logs,
  };
}

function buildSummary(
  run: WorkflowRun,
  steps: ExecutionTraceStep[],
) {
  return {
    totalSteps:
      steps.length,

    completedSteps:
      steps.filter(
        (step) =>
          step.status ===
          "COMPLETED",
      ).length,

    failedSteps:
      steps.filter(
        (step) =>
          step.status ===
          "FAILED",
      ).length,

    skippedSteps:
      steps.filter(
        (step) =>
          step.status ===
          "SKIPPED",
      ).length,

    waitingApprovalSteps:
      steps.filter(
        (step) =>
          step.status ===
          "WAITING_APPROVAL",
      ).length,

    retryCount:
      steps.reduce(
        (
          total,
          step,
        ) =>
          total +
          step.retryCount,
        0,
      ),

    recoveryCount:
      steps.reduce(
        (
          total,
          step,
        ) =>
          total +
          step.recoveryCount,
        0,
      ),

    tokenUsage:
      run.tokenUsage,

    cost:
      run.cost,

    durationMs:
      calculateDurationMs(
        run.startedAt,
        run.completedAt,
      ),
  };
}

export async function getWorkflowExecutionTrace(
  runId: string,
): Promise<WorkflowExecutionTrace> {
  const run =
    await getRun(
      runId,
    );

  if (!run) {
    throw new Error(
      "Run을 찾을 수 없습니다.",
    );
  }

  const workflow =
    await getWorkflow(
      run.workflowId,
    );

  if (!workflow) {
    throw new Error(
      "Workflow를 찾을 수 없습니다.",
    );
  }

  const tools =
    await getTools();

  const steps =
    await Promise.all(
      run.stepRuns.map(
        (
          stepRun,
        ) =>
          buildStepTrace(
            stepRun,
            workflow,
            tools,
          ),
      ),
    );

  return {
    runId:
      run.id,

    workflowId:
      workflow.id,

    runName:
      run.name,

    workflowName:
      workflow.name,

    prompt:
      run.prompt,

    status:
      run.status,

    startedAt:
      run.startedAt,

    completedAt:
      run.completedAt,

    durationMs:
      calculateDurationMs(
        run.startedAt,
        run.completedAt,
      ),

    summary:
      buildSummary(
        run,
        steps,
      ),

    steps,
  };
}