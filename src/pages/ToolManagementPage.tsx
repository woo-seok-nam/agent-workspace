import {
  useEffect,
  useMemo,
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
  fetchTools,
  updateTool,
} from "../api/tools";

import {
  fetchProviders,
  updateProvider,
} from "../api/providers";

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
  ] = useState<
    ProviderConfig[]
  >([]);

  const [
    tools,
    setTools,
  ] = useState<Tool[]>([]);

  const [
    selectedToolId,
    setSelectedToolId,
  ] = useState<
    string | null
  >(null);

  const [
    draftTool,
    setDraftTool,
  ] = useState<
    Tool | undefined
  >();

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [
          providerData,
          toolData,
        ] =
          await Promise.all([
            fetchProviders(),
            fetchTools(),
          ]);

        setProviders(
          providerData,
        );

        setTools(
          toolData,
        );

        const firstTool =
          toolData[0];

        if (firstTool) {
          setSelectedToolId(
            firstTool.id,
          );

          setDraftTool(
            structuredClone(
              firstTool,
            ),
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Tools & Providers 정보를 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

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
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return tools;
      }

      return tools.filter(
        (tool) =>
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
            ),
      );
    }, [
      tools,
      search,
    ]);

  const handleProviderToggle =
    async (
      providerId:
        ProviderConfig["id"],
    ) => {
      const provider =
        providers.find(
          (item) =>
            item.id ===
            providerId,
        );

      if (!provider) {
        return;
      }

      try {
        const savedProvider =
          await updateProvider(
            providerId,
            {
              enabled:
                !provider.enabled,
            },
          );

        setProviders(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                savedProvider.id
                  ? savedProvider
                  : item,
            ),
        );
      } catch (updateError) {
        window.alert(
          updateError instanceof Error
            ? updateError.message
            : "Provider 수정에 실패했습니다.",
        );
      }
    };

  const handleSaveTool =
    async () => {
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

      try {
        const savedTool =
          await updateTool(
            draftTool.id,
            {
              name:
                draftTool.name.trim(),

              description:
                draftTool.description,

              enabled:
                draftTool.enabled,
            },
          );

        setTools(
          (current) =>
            current.map(
              (tool) =>
                tool.id ===
                savedTool.id
                  ? savedTool
                  : tool,
            ),
        );

        setDraftTool(
          structuredClone(
            savedTool,
          ),
        );

        window.alert(
          "Tool 설정이 저장되었습니다.",
        );
      } catch (saveError) {
        window.alert(
          saveError instanceof Error
            ? saveError.message
            : "Tool 설정 저장에 실패했습니다.",
        );
      }
    };

  if (loading) {
    return (
      <div className="tool-management-page">
        Tools & Providers 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (error) {
    return (
      <div className="tool-management-page">
        <h1>
          Tools & Providers
        </h1>

        <p>
          {error}
        </p>

        <p>
          Backend 서버가
          http://localhost:4000 에서
          실행 중인지 확인하세요.
        </p>
      </div>
    );
  }

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
            onSave={() => {
              void handleSaveTool();
            }}
          />
        </div>
      </section>
    </div>
  );
}