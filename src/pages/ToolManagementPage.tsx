import {
  useEffect,
  useState,
} from "react";

import {
  Cpu,
  Search,
  Wrench,
} from "lucide-react";

import type {
  ProviderConfig,
  Tool,
} from "../features/tools/types";

import {
  mockProviders,
} from "../mocks/providers";

import {
  mockTools,
} from "../mocks/tools";

import {
  ProviderCard,
} from "../features/tools/components/ProviderCard";

import {
  ToolCard,
} from "../features/tools/components/ToolCard";

import {
  ToolEditor,
} from "../features/tools/components/ToolEditor";

import "../features/tools/ToolManagement.css";

const PROVIDER_STORAGE_KEY =
  "agent-workspace-providers";

const TOOL_STORAGE_KEY =
  "agent-workspace-tools";

function loadProviders(): ProviderConfig[] {
  const saved =
    localStorage.getItem(
      PROVIDER_STORAGE_KEY,
    );

  if (!saved) {
    return structuredClone(
      mockProviders,
    );
  }

  try {
    return JSON.parse(
      saved,
    ) as ProviderConfig[];
  } catch {
    localStorage.removeItem(
      PROVIDER_STORAGE_KEY,
    );

    return structuredClone(
      mockProviders,
    );
  }
}

function loadTools(): Tool[] {
  const saved =
    localStorage.getItem(
      TOOL_STORAGE_KEY,
    );

  if (!saved) {
    return structuredClone(
      mockTools,
    );
  }

  try {
    return JSON.parse(
      saved,
    ) as Tool[];
  } catch {
    localStorage.removeItem(
      TOOL_STORAGE_KEY,
    );

    return structuredClone(
      mockTools,
    );
  }
}

export function ToolManagementPage() {
  const [
    providers,
    setProviders,
  ] =
    useState<
      ProviderConfig[]
    >(
      loadProviders,
    );

  const [
    tools,
    setTools,
  ] =
    useState<Tool[]>(
      loadTools,
    );

  const [
    selectedToolId,
    setSelectedToolId,
  ] =
    useState<
      string | null
    >(
      tools[0]?.id ??
        null,
    );

  const [
    draftTool,
    setDraftTool,
  ] =
    useState<
      Tool | undefined
    >(
      tools[0]
        ? structuredClone(
            tools[0],
          )
        : undefined,
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  useEffect(() => {
    const selected =
      tools.find(
        (tool) =>
          tool.id ===
          selectedToolId,
      );

    setDraftTool(
      selected
        ? structuredClone(
            selected,
          )
        : undefined,
    );
  }, [
    selectedToolId,
    tools,
  ]);

  const filteredTools =
    tools.filter(
      (tool) => {
        const keyword =
          search
            .trim()
            .toLowerCase();

        if (!keyword) {
          return true;
        }

        return (
          tool.name
            .toLowerCase()
            .includes(
              keyword,
            ) ||
          (
            tool.description ??
            ""
          )
            .toLowerCase()
            .includes(
              keyword,
            )
        );
      },
    );

  const handleProviderToggle = (
    providerId:
      ProviderConfig["id"],
  ) => {
    const nextProviders =
      providers.map(
        (provider) =>
          provider.id ===
          providerId
            ? {
                ...provider,

                enabled:
                  !provider.enabled,
              }
            : provider,
      );

    setProviders(
      nextProviders,
    );

    localStorage.setItem(
      PROVIDER_STORAGE_KEY,

      JSON.stringify(
        nextProviders,
      ),
    );
  };

  const handleSaveTool = () => {
    if (!draftTool) {
      return;
    }

    if (
      !draftTool.name.trim()
    ) {
      window.alert(
        "Tool 이름을 입력하세요.",
      );

      return;
    }

    const nextTool: Tool = {
      ...draftTool,

      name:
        draftTool.name.trim(),
    };

    const nextTools =
      tools.map(
        (tool) =>
          tool.id ===
          nextTool.id
            ? nextTool
            : tool,
      );

    setTools(
      nextTools,
    );

    setDraftTool(
      structuredClone(
        nextTool,
      ),
    );

    localStorage.setItem(
      TOOL_STORAGE_KEY,

      JSON.stringify(
        nextTools,
      ),
    );

    window.alert(
      "Tool 설정이 저장되었습니다.",
    );
  };

  return (
    <div className="tool-management-page">
      <header className="tool-management-header">
        <div>
          <span>
            Agent Workspace
          </span>

          <h1>
            Tools & Providers
          </h1>

          <p>
            Agent가 사용할 AI
            Provider와 외부 Tool을
            관리합니다.
          </p>
        </div>
      </header>

      <section className="provider-section">
        <div className="management-section-heading">
          <div>
            <Cpu size={16} />

            <div>
              <h2>
                AI Providers
              </h2>

              <p>
                Agent가 사용할 AI
                모델 공급자를
                관리합니다.
              </p>
            </div>
          </div>

          <span>
            {providers.length}
          </span>
        </div>

        <div className="provider-grid">
          {providers.map(
            (provider) => (
              <ProviderCard
                key={
                  provider.id
                }
                provider={
                  provider
                }
                onToggle={
                  handleProviderToggle
                }
              />
            ),
          )}
        </div>
      </section>

      <section className="tools-section">
        <div className="management-section-heading">
          <div>
            <Wrench size={16} />

            <div>
              <h2>
                Tools
              </h2>

              <p>
                Agent가 실행할 수 있는
                기능을 관리합니다.
              </p>
            </div>
          </div>

          <span>
            {tools.length}
          </span>
        </div>

        <div className="tool-management-layout">
          <aside className="tool-list-panel">
            <div className="tool-search">
              <Search
                size={14}
              />

              <input
                type="text"
                placeholder="Tool 검색"
                value={
                  search
                }
                onChange={(
                  event,
                ) => {
                  setSearch(
                    event.target
                      .value,
                  );
                }}
              />
            </div>

            <div className="tool-list">
              {filteredTools.length >
              0 ? (
                filteredTools.map(
                  (tool) => (
                    <ToolCard
                      key={
                        tool.id
                      }
                      tool={
                        tool
                      }
                      selected={
                        tool.id ===
                        selectedToolId
                      }
                      onClick={() =>
                        setSelectedToolId(
                          tool.id,
                        )
                      }
                    />
                  ),
                )
              ) : (
                <div className="tool-list__empty">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>
          </aside>

          <ToolEditor
            tool={
              draftTool
            }
            onChange={
              setDraftTool
            }
            onSave={
              handleSaveTool
            }
          />
        </div>
      </section>
    </div>
  );
}