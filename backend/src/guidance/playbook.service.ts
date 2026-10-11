import {
  workflowPlaybooks,
} from "./playbooks.js";

import type {
  GuidanceRecommendation,
  PlaybookMatch,
  WorkflowPlaybook,
} from "./playbook.types.js";

function normalizeText(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /\s+/g,
      " ",
    );
}

function calculateKeywordScore(
  normalizedGoal: string,
  playbook: WorkflowPlaybook,
) {
  const matchedKeywords =
    playbook.keywords.filter(
      (keyword) => {
        const normalizedKeyword =
          normalizeText(
            keyword,
          );

        return (
          normalizedKeyword.length >
            0 &&
          normalizedGoal.includes(
            normalizedKeyword,
          )
        );
      },
    );

  if (
    matchedKeywords.length ===
    0
  ) {
    return {
      score:
        0,

      matchedKeywords,
    };
  }

  /*
   * 기본 Keyword Match 점수.
   *
   * 첫 Match는 강하게 반영하고,
   * 이후 Match는 추가 근거로 누적한다.
   */
  let score =
    45;

  score +=
    Math.min(
      35,
      (
        matchedKeywords.length -
        1
      ) *
        10,
    );

  /*
   * 더 구체적인 Keyword가 Match된 경우
   * 조금 더 높은 점수를 준다.
   */
  const longKeywordMatches =
    matchedKeywords.filter(
      (keyword) =>
        keyword.trim().length >=
        4,
    ).length;

  score +=
    Math.min(
      10,
      longKeywordMatches *
        3,
    );

  return {
    score:
      Math.min(
        90,
        score,
      ),

    matchedKeywords,
  };
}

function calculateExampleScore(
  normalizedGoal: string,
  playbook: WorkflowPlaybook,
) {
  let score =
    0;

  for (
    const example
    of playbook.examples
  ) {
    const normalizedExample =
      normalizeText(
        example,
      );

    /*
     * 완전 동일 문장은 거의 같은 요청으로 본다.
     */
    if (
      normalizedGoal ===
      normalizedExample
    ) {
      score =
        Math.max(
          score,
          100,
        );

      continue;
    }

    const goalTokens =
      new Set(
        normalizedGoal
          .split(
            " ",
          )
          .filter(
            Boolean,
          ),
      );

    const exampleTokens =
      normalizedExample
        .split(
          " ",
        )
        .filter(
          Boolean,
        );

    if (
      exampleTokens.length ===
      0
    ) {
      continue;
    }

    const commonTokens =
      exampleTokens.filter(
        (token) =>
          goalTokens.has(
            token,
          ),
      ).length;

    const ratio =
      commonTokens /
      exampleTokens.length;

    if (
      ratio >=
      0.6
    ) {
      score =
        Math.max(
          score,
          25,
        );
    } else if (
      ratio >=
      0.3
    ) {
      score =
        Math.max(
          score,
          12,
        );
    }
  }

  return score;
}

function buildReasons(
  playbook: WorkflowPlaybook,
  matchedKeywords: string[],
  score: number,
) {
  const reasons:
    string[] = [];

  if (
    matchedKeywords.length >
    0
  ) {
    reasons.push(
      `요청에서 ${matchedKeywords
        .map(
          (keyword) =>
            `"${keyword}"`,
        )
        .join(
          ", ",
        )} 키워드가 확인되었습니다.`,
    );
  }

  if (
    playbook.steps.some(
      (step) =>
        step.suggestedTools?.includes(
          "web-search",
        ),
    )
  ) {
    reasons.push(
      "이 Playbook은 외부 정보 검색이 필요한 작업에 적합합니다.",
    );
  }

  if (
    playbook.steps.some(
      (step) =>
        step.requireApproval,
    )
  ) {
    reasons.push(
      "이 Playbook에는 사용자 승인 단계가 포함되어 있습니다.",
    );
  }

  if (
    score >=
    80
  ) {
    reasons.push(
      "사용자의 목표와 매우 높은 수준으로 일치합니다.",
    );
  } else if (
    score >=
    55
  ) {
    reasons.push(
      "사용자의 목표와 주요 작업 패턴이 일치합니다.",
    );
  }

  return reasons;
}

function scorePlaybook(
  goal: string,
  playbook: WorkflowPlaybook,
): PlaybookMatch {
  const normalizedGoal =
    normalizeText(
      goal,
    );

  const keywordResult =
    calculateKeywordScore(
      normalizedGoal,
      playbook,
    );

  const exampleScore =
    calculateExampleScore(
      normalizedGoal,
      playbook,
    );

  /*
   * priority는 동점 후보의 순서를 안정적으로
   * 조절하기 위한 작은 가중치만 준다.
   */
  const priorityScore =
    Math.min(
      5,
      Math.max(
        0,
        playbook.priority /
          20,
      ),
    );

  const score =
    Math.min(
      100,
      Math.round(
        keywordResult.score +
          exampleScore +
          priorityScore,
      ),
    );

  return {
    playbook,

    score,

    matchedKeywords:
      keywordResult.matchedKeywords,

    reasons:
      buildReasons(
        playbook,
        keywordResult.matchedKeywords,
        score,
      ),
  };
}

function getFallbackPlaybook() {
  return (
    workflowPlaybooks.find(
      (playbook) =>
        playbook.id ===
        "general-agent-task",
    ) ??
    null
  );
}

export function getEnabledPlaybooks() {
  return workflowPlaybooks.filter(
    (playbook) =>
      playbook.enabled,
  );
}

export function getPlaybookById(
  playbookId: string,
) {
  return (
    workflowPlaybooks.find(
      (playbook) =>
        playbook.id ===
        playbookId &&
        playbook.enabled,
    ) ??
    null
  );
}

export function matchPlaybooks(
  goal: string,
) {
  const normalizedGoal =
    normalizeText(
      goal,
    );

  if (
    !normalizedGoal
  ) {
    return [];
  }

  return getEnabledPlaybooks()
    .filter(
      (playbook) =>
        playbook.id !==
        "general-agent-task",
    )
    .map(
      (playbook) =>
        scorePlaybook(
          normalizedGoal,
          playbook,
        ),
    )
    .filter(
      (match) =>
        match.score >
        0,
    )
    .sort(
      (
        left,
        right,
      ) => {
        if (
          right.score !==
          left.score
        ) {
          return (
            right.score -
            left.score
          );
        }

        return (
          right.playbook.priority -
          left.playbook.priority
        );
      },
    );
}

export function recommendPlaybook(
  goal: string,
): GuidanceRecommendation {
  const normalizedGoal =
    normalizeText(
      goal,
    );

  if (
    !normalizedGoal
  ) {
    return {
      goal,

      recommendedPlaybook:
        null,

      alternatives:
        [],

      confidence:
        0,

      reasons: [
        "Workflow를 추천하려면 작업 목표가 필요합니다.",
      ],
    };
  }

  const matches =
    matchPlaybooks(
      normalizedGoal,
    );

  const bestMatch =
    matches[0];

  /*
   * 명확한 Match가 없다면
   * General Agent Task를 fallback으로 사용한다.
   */
  if (
    !bestMatch ||
    bestMatch.score <
      30
  ) {
    const fallback =
      getFallbackPlaybook();

    return {
      goal,

      recommendedPlaybook:
        fallback,

      alternatives:
        matches.slice(
          0,
          3,
        ),

      confidence:
        bestMatch?.score ??
        15,

      reasons: [
        "특정 Playbook과의 명확한 일치도를 찾지 못했습니다.",

        "범용 Agent Workflow를 기본 구조로 추천합니다.",
      ],
    };
  }

  return {
    goal,

    recommendedPlaybook:
      bestMatch.playbook,

    alternatives:
      matches
        .slice(
          1,
          4,
        ),

    confidence:
      bestMatch.score,

    reasons:
      bestMatch.reasons,
  };
}