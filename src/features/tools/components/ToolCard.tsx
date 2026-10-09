import {
  CheckCircle2,
  CircleOff,
  Code2,
  File,
  FileSearch,
  Globe2,
  Network,
  Wrench,
} from "lucide-react";

import type {
  Tool,
  ToolType,
} from "../types";

interface ToolCardProps {
  tool: Tool;

  selected?: boolean;

  onClick: () => void;
}

export function ToolCard({
  tool,
  selected = false,
  onClick,
}: ToolCardProps) {
  const Icon =
    getToolIcon(
      tool.type,
    );

  return (
    <button
      type="button"
      className={[
        "tool-card",
        selected
          ? "tool-card--selected"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      <div className="tool-card__icon">
        <Icon size={17} />
      </div>

      <div className="tool-card__content">
        <div className="tool-card__title">
          <strong>
            {tool.name}
          </strong>

          {tool.enabled ? (
            <span className="tool-status tool-status--enabled">
              <CheckCircle2
                size={10}
              />
              Active
            </span>
          ) : (
            <span className="tool-status tool-status--disabled">
              <CircleOff
                size={10}
              />
              Disabled
            </span>
          )}
        </div>

        <p>
          {tool.description ??
            "설명이 없습니다."}
        </p>

        <span className="tool-type">
          {formatToolType(
            tool.type,
          )}
        </span>
      </div>
    </button>
  );
}

function getToolIcon(
  type: ToolType,
) {
  switch (type) {
    case "web_search":
      return Globe2;

    case "browser":
      return Network;

    case "file":
      return File;

    case "api":
      return Wrench;

    case "code":
      return Code2;

    case "document_parser":
      return FileSearch;
  }
}

function formatToolType(
  type: ToolType,
) {
  switch (type) {
    case "web_search":
      return "Web Search";

    case "browser":
      return "Browser";

    case "file":
      return "File";

    case "api":
      return "API";

    case "code":
      return "Code";

    case "document_parser":
      return "Document Parser";
  }
}