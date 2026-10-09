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
  getProviders,
  getTools,
  saveProviders,
  saveTools,
} from "../data/catalogRepository";

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

export function ToolManagementPage() {
  const [
    providers,
    setProviders,
  ] =
    useState<
      ProviderConfig[]
    >(
      getProviders,
    );

  const [
    tools,
    setTools,
  ] =
    useState<Tool[]>(
      getTools,
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

    saveProviders(
      nextProviders,
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

    saveTools(
      nextTools,
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