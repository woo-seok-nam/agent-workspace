import type {
  WorkflowPlaybook,
} from "./playbook.types.js";

export const workflowPlaybooks:
  WorkflowPlaybook[] = [
    {
      id:
        "research-report",

      name:
        "Research & Report",

      description:
        "주제 조사부터 분석, 보고서 작성까지 수행하는 기본 리서치 Workflow입니다.",

      category:
        "RESEARCH",

      keywords: [
        "조사",
        "리서치",
        "research",
        "자료",
        "검색",
        "보고서",
        "시장조사",
        "동향",
        "트렌드",
        "정보수집",
      ],

      examples: [
        "AI Agent 시장 동향을 조사해서 보고서를 만들어줘",
        "경쟁사 자료를 검색하고 핵심 내용을 정리해줘",
        "특정 기술에 대한 최신 정보를 조사해줘",
      ],

      priority:
        100,

      enabled:
        true,

      steps: [
        {
          id:
            "input",

          name:
            "Goal",

          description:
            "사용자의 조사 목표를 입력받습니다.",

          type:
            "input",
        },

        {
          id:
            "research",

          name:
            "Research",

          description:
            "주제와 관련된 자료를 조사하고 근거를 수집합니다.",

          type:
            "agent",

          role:
            "Research Agent",

          suggestedTools: [
            "web-search",
          ],
        },

        {
          id:
            "analysis",

          name:
            "Analyze",

          description:
            "수집한 자료를 비교하고 핵심 내용을 분석합니다.",

          type:
            "agent",

          role:
            "Analysis Agent",
        },

        {
          id:
            "writer",

          name:
            "Write Report",

          description:
            "분석 결과를 구조화된 보고서로 작성합니다.",

          type:
            "agent",

          role:
            "Writer Agent",
        },

        {
          id:
            "output",

          name:
            "Result",

          description:
            "최종 보고서를 결과물로 반환합니다.",

          type:
            "output",
        },
      ],

      edges: [
        {
          source:
            "input",

          target:
            "research",
        },

        {
          source:
            "research",

          target:
            "analysis",
        },

        {
          source:
            "analysis",

          target:
            "writer",
        },

        {
          source:
            "writer",

          target:
            "output",
        },
      ],
    },

    {
      id:
        "compare-and-recommend",

      name:
        "Compare & Recommend",

      description:
        "여러 후보를 조사하고 비교한 뒤 최종 추천안을 만드는 Workflow입니다.",

      category:
        "ANALYSIS",

      keywords: [
        "비교",
        "추천",
        "선택",
        "장단점",
        "후보",
        "어떤게",
        "어느것",
        "compare",
        "recommend",
        "best",
      ],

      examples: [
        "React와 Vue를 비교해서 어떤 걸 선택해야 할지 추천해줘",
        "여러 클라우드 서비스를 조사해서 가장 적합한 걸 골라줘",
        "후보 제품들의 장단점을 비교해줘",
      ],

      priority:
        90,

      enabled:
        true,

      steps: [
        {
          id:
            "input",

          name:
            "Goal",

          description:
            "비교하고 싶은 대상과 기준을 입력받습니다.",

          type:
            "input",
        },

        {
          id:
            "research",

          name:
            "Collect Information",

          description:
            "비교 대상에 대한 정보를 수집합니다.",

          type:
            "agent",

          role:
            "Research Agent",

          suggestedTools: [
            "web-search",
          ],
        },

        {
          id:
            "compare",

          name:
            "Compare",

          description:
            "후보를 동일한 기준으로 비교합니다.",

          type:
            "agent",

          role:
            "Analysis Agent",
        },

        {
          id:
            "recommend",

          name:
            "Recommend",

          description:
            "사용자 목표에 가장 적합한 선택지를 추천합니다.",

          type:
            "agent",

          role:
            "Decision Agent",
        },

        {
          id:
            "output",

          name:
            "Result",

          description:
            "비교 결과와 추천안을 반환합니다.",

          type:
            "output",
        },
      ],

      edges: [
        {
          source:
            "input",

          target:
            "research",
        },

        {
          source:
            "research",

          target:
            "compare",
        },

        {
          source:
            "compare",

          target:
            "recommend",
        },

        {
          source:
            "recommend",

          target:
            "output",
        },
      ],
    },

    {
      id:
        "draft-review-revise",

      name:
        "Draft → Review → Revise",

      description:
        "초안을 작성한 뒤 검토하고 개선하여 최종 결과물을 만드는 Workflow입니다.",

      category:
        "WRITING",

      keywords: [
        "작성",
        "글",
        "문서",
        "초안",
        "보고서",
        "기획서",
        "제안서",
        "메일",
        "리뷰",
        "검토",
        "수정",
        "writing",
        "draft",
      ],

      examples: [
        "기획서 초안을 만들고 검토해서 완성해줘",
        "보고서를 작성한 뒤 오류를 검토해줘",
        "문서를 작성하고 더 자연스럽게 수정해줘",
      ],

      priority:
        85,

      enabled:
        true,

      steps: [
        {
          id:
            "input",

          name:
            "Goal",

          description:
            "작성 목표와 요구사항을 입력받습니다.",

          type:
            "input",
        },

        {
          id:
            "draft",

          name:
            "Draft",

          description:
            "요구사항을 기반으로 첫 초안을 작성합니다.",

          type:
            "agent",

          role:
            "Writer Agent",
        },

        {
          id:
            "review",

          name:
            "Review",

          description:
            "초안의 정확성, 구조, 표현을 검토합니다.",

          type:
            "agent",

          role:
            "Reviewer Agent",
        },

        {
          id:
            "revise",

          name:
            "Revise",

          description:
            "검토 의견을 반영하여 최종 결과물을 작성합니다.",

          type:
            "agent",

          role:
            "Editor Agent",
        },

        {
          id:
            "output",

          name:
            "Result",

          description:
            "수정된 최종 문서를 반환합니다.",

          type:
            "output",
        },
      ],

      edges: [
        {
          source:
            "input",

          target:
            "draft",
        },

        {
          source:
            "draft",

          target:
            "review",
        },

        {
          source:
            "review",

          target:
            "revise",
        },

        {
          source:
            "revise",

          target:
            "output",
        },
      ],
    },

    {
      id:
        "plan-execute-review",

      name:
        "Plan → Execute → Review",

      description:
        "먼저 작업 계획을 수립한 뒤 실행하고 결과를 검토하는 범용 Workflow입니다.",

      category:
        "PLANNING",

      keywords: [
        "계획",
        "기획",
        "프로젝트",
        "단계",
        "실행",
        "로드맵",
        "plan",
        "roadmap",
        "strategy",
        "전략",
      ],

      examples: [
        "프로젝트 개발 계획을 세우고 실행 방안을 정리해줘",
        "취업 준비 로드맵을 만들어줘",
        "작업을 단계별로 계획해서 수행해줘",
      ],

      priority:
        80,

      enabled:
        true,

      steps: [
        {
          id:
            "input",

          name:
            "Goal",

          description:
            "사용자의 작업 목표를 입력받습니다.",

          type:
            "input",
        },

        {
          id:
            "plan",

          name:
            "Plan",

          description:
            "목표를 달성하기 위한 실행 계획을 수립합니다.",

          type:
            "agent",

          role:
            "Planner Agent",
        },

        {
          id:
            "execute",

          name:
            "Execute",

          description:
            "수립된 계획에 따라 실제 작업을 수행합니다.",

          type:
            "agent",

          role:
            "Execution Agent",
        },

        {
          id:
            "review",

          name:
            "Review",

          description:
            "실행 결과가 목표에 부합하는지 검토합니다.",

          type:
            "agent",

          role:
            "Reviewer Agent",
        },

        {
          id:
            "output",

          name:
            "Result",

          description:
            "검토된 최종 결과를 반환합니다.",

          type:
            "output",
        },
      ],

      edges: [
        {
          source:
            "input",

          target:
            "plan",
        },

        {
          source:
            "plan",

          target:
            "execute",
        },

        {
          source:
            "execute",

          target:
            "review",
        },

        {
          source:
            "review",

          target:
            "output",
        },
      ],
    },

    {
      id:
        "review-with-approval",

      name:
        "Review with Human Approval",

      description:
        "AI가 결과를 검토한 뒤 사용자의 승인을 거쳐 최종 결과를 확정하는 Workflow입니다.",

      category:
        "REVIEW",

      keywords: [
        "승인",
        "확인",
        "검수",
        "검토",
        "사람",
        "최종확인",
        "approval",
        "human",
        "review",
      ],

      examples: [
        "초안을 만든 다음 내가 승인하면 최종 결과로 만들어줘",
        "AI가 검토하고 최종 단계에서는 사람의 확인을 받게 해줘",
        "자동화하되 마지막에는 반드시 승인받게 해줘",
      ],

      priority:
        95,

      enabled:
        true,

      steps: [
        {
          id:
            "input",

          name:
            "Goal",

          description:
            "검토할 작업 목표를 입력받습니다.",

          type:
            "input",
        },

        {
          id:
            "execute",

          name:
            "Execute",

          description:
            "AI Agent가 실제 작업을 수행합니다.",

          type:
            "agent",

          role:
            "Execution Agent",
        },

        {
          id:
            "review",

          name:
            "Review",

          description:
            "작업 결과를 검토하고 승인 가능한 상태로 정리합니다.",

          type:
            "agent",

          role:
            "Reviewer Agent",
        },

        {
          id:
            "approval",

          name:
            "Human Approval",

          description:
            "사용자의 명시적 승인을 기다립니다.",

          type:
            "approval",

          requireApproval:
            true,
        },

        {
          id:
            "output",

          name:
            "Result",

          description:
            "승인된 결과를 최종 결과물로 반환합니다.",

          type:
            "output",
        },
      ],

      edges: [
        {
          source:
            "input",

          target:
            "execute",
        },

        {
          source:
            "execute",

          target:
            "review",
        },

        {
          source:
            "review",

          target:
            "approval",
        },

        {
          source:
            "approval",

          target:
            "output",
        },
      ],
    },

    {
      id:
        "general-agent-task",

      name:
        "General Agent Task",

      description:
        "특정 Playbook에 명확히 해당하지 않는 작업을 위한 기본 Workflow입니다.",

      category:
        "GENERAL",

      keywords: [],

      examples: [
        "일반적인 AI 작업을 수행해줘",
      ],

      priority:
        1,

      enabled:
        true,

      steps: [
        {
          id:
            "input",

          name:
            "Goal",

          description:
            "사용자 목표를 입력받습니다.",

          type:
            "input",
        },

        {
          id:
            "agent",

          name:
            "Execute Task",

          description:
            "사용자의 요청을 분석하고 작업을 수행합니다.",

          type:
            "agent",

          role:
            "General Agent",
        },

        {
          id:
            "output",

          name:
            "Result",

          description:
            "Agent 실행 결과를 반환합니다.",

          type:
            "output",
        },
      ],

      edges: [
        {
          source:
            "input",

          target:
            "agent",
        },

        {
          source:
            "agent",

          target:
            "output",
        },
      ],
    },
  ];