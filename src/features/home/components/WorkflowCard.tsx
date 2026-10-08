import {
  BarChart3,
  Code2,
  FileText,
  Search,
  type LucideIcon,
} from "lucide-react";

import type { Workflow } from "../../workflow/types";

interface WorkflowCardProps {
  workflow: Workflow;
}

const workflowIcons: Record<string, LucideIcon> = {
  "workflow-research-report": Search,
  "workflow-code-review": Code2,
  "workflow-data-analysis": BarChart3,
  "workflow-document-summary": FileText,
};

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const Icon = workflowIcons[workflow.id] ?? FileText;

  const agentCount = new Set(
    workflow.nodes
      .map((node) => node.agentId)
      .filter((agentId): agentId is string => Boolean(agentId)),
  ).size;

  return (
    <article className="workflow-card">
      <div className="workflow-card__icon">
        <Icon size={22} />
      </div>

      <h3>{workflow.name}</h3>

      <p>{workflow.description}</p>

      <div className="workflow-card__meta">
        <span>{workflow.nodes.length} Steps</span>
        <span>{agentCount} Agents</span>
      </div>
    </article>
  );
}