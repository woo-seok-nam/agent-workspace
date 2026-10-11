import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bot,
  Plus,
  Save,
  Search,
} from "lucide-react";

import type {
  Agent,
} from "../features/agents/types";

import {
  createAgent,
  deleteAgent,
  fetchAgents,
  updateAgent,
} from "../api/agents";

import {
  getEnabledModels,
} from "../data/catalogRepository";

import {
  AgentCard,
} from "../features/agents/components/AgentCard";

import {
  AgentEditor,
} from "../features/agents/components/AgentEditor";

import "../features/agents/AgentManagement.css";

export function AgentManagementPage() {
  /*
   * 서버에 마지막으로 저장된 Agent 상태.
   */
  const [
    agents,
    setAgents,
  ] =
    useState<
      Agent[]
    >([]);

  /*
   * 화면에서 사용자가 수정 중인 전체 Agent Draft.
   *
   * 기존에는 선택된 Agent 하나만 draftAgent로
   * 관리했기 때문에 다른 Agent를 선택하면
   * 수정 내용이 사라질 수 있었다.
   *
   * 이제 모든 Agent의 Draft를 유지한다.
   */
  const [
    draftAgents,
    setDraftAgents,
  ] =
    useState<
      Agent[]
    >([]);

  const [
    selectedAgentId,
    setSelectedAgentId,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    saveError,
    setSaveError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  useEffect(() => {
    async function load() {
      try {
        setLoading(
          true,
        );

        setError(
          null,
        );

        const data =
          await fetchAgents();

        setAgents(
          data,
        );

        setDraftAgents(
          structuredClone(
            data,
          ),
        );

        setSelectedAgentId(
          data[0]?.id ??
            null,
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Agent 목록을 불러오지 못했습니다.",
        );
      } finally {
        setLoading(
          false,
        );
      }
    }

    void load();
  }, []);

  /*
   * 저장된 원본과 Draft를 비교해서
   * 실제 변경된 Agent ID만 계산한다.
   */
  const dirtyAgentIds =
    useMemo(() => {
      const ids =
        new Set<string>();

      for (
        const draftAgent
        of draftAgents
      ) {
        const savedAgent =
          agents.find(
            (agent) =>
              agent.id ===
              draftAgent.id,
          );

        if (!savedAgent) {
          continue;
        }

        if (
          !isSameAgentConfiguration(
            savedAgent,
            draftAgent,
          )
        ) {
          ids.add(
            draftAgent.id,
          );
        }
      }

      return ids;
    }, [
      agents,
      draftAgents,
    ]);

  const hasUnsavedChanges =
    dirtyAgentIds.size >
    0;

  /*
   * 브라우저 새로고침 / 탭 닫기 경고.
   *
   * 저장되지 않은 변경사항이 없으면
   * 아무 경고도 발생하지 않는다.
   */
  useEffect(() => {
    if (
      !hasUnsavedChanges
    ) {
      return;
    }

    function handleBeforeUnload(
      event: BeforeUnloadEvent,
    ) {
      event.preventDefault();

      event.returnValue =
        "";
    }

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );
    };
  }, [
    hasUnsavedChanges,
  ]);

  const selectedAgent =
    useMemo(
      () =>
        draftAgents.find(
          (agent) =>
            agent.id ===
            selectedAgentId,
        ),
      [
        draftAgents,
        selectedAgentId,
      ],
    );

  const filteredAgents =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return draftAgents;
      }

      return draftAgents.filter(
        (agent) =>
          agent.name
            .toLowerCase()
            .includes(
              keyword,
            ) ||
          (
            agent.description ??
            ""
          )
            .toLowerCase()
            .includes(
              keyword,
            ),
      );
    }, [
      draftAgents,
      search,
    ]);

  function handleAgentChange(
    changedAgent: Agent,
  ) {
    setDraftAgents(
      (current) =>
        current.map(
          (agent) =>
            agent.id ===
            changedAgent.id
              ? changedAgent
              : agent,
        ),
    );

    setSaveError(
      null,
    );
  }

  const handleCreateAgent =
    async () => {
      const defaultModel =
        getEnabledModels()[0];

      if (!defaultModel) {
        window.alert(
          "사용 가능한 Model이 없습니다.",
        );

        return;
      }

      try {
        const newAgent =
          await createAgent({
            name:
              "New Agent",

            description:
              "새로운 AI Agent",

            modelId:
              defaultModel.id,

            toolIds: [],

            enabled:
              true,
          });

        setAgents(
          (current) => [
            ...current,
            newAgent,
          ],
        );

        setDraftAgents(
          (current) => [
            ...current,
            structuredClone(
              newAgent,
            ),
          ],
        );

        setSelectedAgentId(
          newAgent.id,
        );
      } catch (createError) {
        window.alert(
          createError instanceof Error
            ? createError.message
            : "Agent 생성에 실패했습니다.",
        );
      }
    };

  const handleSaveAll =
    async () => {
      if (
        dirtyAgentIds.size ===
        0
      ) {
        return;
      }

      const changedAgents =
        draftAgents.filter(
          (agent) =>
            dirtyAgentIds.has(
              agent.id,
            ),
        );

      const invalidAgent =
        changedAgents.find(
          (agent) =>
            !agent.name.trim(),
        );

      if (invalidAgent) {
        setSelectedAgentId(
          invalidAgent.id,
        );

        window.alert(
          "Agent 이름을 입력하세요.",
        );

        return;
      }

      try {
        setSaving(
          true,
        );

        setSaveError(
          null,
        );

        /*
         * 여러 Agent를 동시에 저장한다.
         *
         * 한 Agent의 저장 실패 때문에
         * 다른 Agent 저장 결과까지 잃지 않도록
         * Promise.allSettled을 사용한다.
         */
        const results =
          await Promise.allSettled(
            changedAgents.map(
              async (
                agent,
              ) =>
                updateAgent(
                  agent.id,
                  {
                    name:
                      agent.name.trim(),

                    description:
                      agent.description,

                    modelId:
                      agent.modelId,

                    toolIds:
                      agent.toolIds,

                    enabled:
                      agent.enabled,
                  },
                ),
            ),
          );

        const savedAgents =
          new Map<
            string,
            Agent
          >();

        const failedAgentIds: string[] =
          [];

        results.forEach(
          (
            result,
            index,
          ) => {
            const sourceAgent =
              changedAgents[
                index
              ];

            if (
              !sourceAgent
            ) {
              return;
            }

            if (
              result.status ===
              "fulfilled"
            ) {
              savedAgents.set(
                result.value.id,
                result.value,
              );

              return;
            }

            failedAgentIds.push(
              sourceAgent.id,
            );
          },
        );

        /*
         * 성공한 Agent만 서버 원본 상태에 반영.
         */
        if (
          savedAgents.size >
          0
        ) {
          setAgents(
            (current) =>
              current.map(
                (agent) =>
                  savedAgents.get(
                    agent.id,
                  ) ??
                  agent,
              ),
          );

          /*
           * 서버가 정규화해서 반환한 값을
           * Draft에도 반영한다.
           */
          setDraftAgents(
            (current) =>
              current.map(
                (agent) =>
                  savedAgents.get(
                    agent.id,
                  ) ??
                  agent,
              ),
          );
        }

        if (
          failedAgentIds.length >
          0
        ) {
          setSaveError(
            `${savedAgents.size}개 Agent는 저장되었고 ${failedAgentIds.length}개 Agent는 저장하지 못했습니다. 실패한 Agent의 변경사항은 그대로 유지됩니다.`,
          );

          return;
        }

        window.alert(
          `${savedAgents.size}개의 Agent 변경사항이 저장되었습니다.`,
        );
      } catch (saveAllError) {
        setSaveError(
          saveAllError instanceof Error
            ? saveAllError.message
            : "Agent 저장에 실패했습니다.",
        );
      } finally {
        setSaving(
          false,
        );
      }
    };

  const handleDelete =
    async () => {
      if (
        !selectedAgent
      ) {
        return;
      }

      const confirmed =
        window.confirm(
          `"${selectedAgent.name}" Agent를 삭제하시겠습니까?`,
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteAgent(
          selectedAgent.id,
        );

        const nextAgents =
          agents.filter(
            (agent) =>
              agent.id !==
              selectedAgent.id,
          );

        const nextDraftAgents =
          draftAgents.filter(
            (agent) =>
              agent.id !==
              selectedAgent.id,
          );

        setAgents(
          nextAgents,
        );

        setDraftAgents(
          nextDraftAgents,
        );

        setSelectedAgentId(
          nextDraftAgents[0]
            ?.id ??
            null,
        );
      } catch (deleteError) {
        window.alert(
          deleteError instanceof Error
            ? deleteError.message
            : "Agent 삭제에 실패했습니다.",
        );
      }
    };

  if (loading) {
    return (
      <div className="agent-management-page">
        Agent 목록을 불러오는 중입니다...
      </div>
    );
  }

  if (error) {
    return (
      <div className="agent-management-page">
        <h1>
          Agents
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
    <div className="agent-management-page">
      <header className="agent-management-header">
        <div>
          <span>
            Agent Workspace
          </span>

          <h1>
            Agents
          </h1>

          <p>
            Workflow에서 사용할
            AI Agent와 Model,
            Tool 구성을 관리합니다.
          </p>

          {hasUnsavedChanges && (
            <p>
              저장되지 않은 변경사항이{" "}
              <strong>
                {
                  dirtyAgentIds.size
                }
                개
              </strong>
              {" "}
              있습니다.
            </p>
          )}

          {saveError && (
            <p>
              {saveError}
            </p>
          )}
        </div>

        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              "8px",
          }}
        >
          <button
            type="button"
            className="primary-button"
            disabled={
              !hasUnsavedChanges ||
              saving
            }
            onClick={() => {
              void handleSaveAll();
            }}
          >
            <Save
              size={
                15
              }
            />

            {saving
              ? "저장 중..."
              : hasUnsavedChanges
                ? `변경사항 저장 (${dirtyAgentIds.size})`
                : "변경사항 저장"}
          </button>

          <button
            type="button"
            className="primary-button"
            disabled={
              saving
            }
            onClick={() => {
              void handleCreateAgent();
            }}
          >
            <Plus
              size={
                15
              }
            />

            New Agent
          </button>
        </div>
      </header>

      <div className="agent-management-layout">
        <aside className="agent-list-panel">
          <div className="agent-list-panel__header">
            <div>
              <Bot
                size={
                  15
                }
              />

              <strong>
                Agents
              </strong>
            </div>

            <span>
              {
                draftAgents.length
              }
            </span>
          </div>

          <div className="agent-search">
            <Search
              size={
                14
              }
            />

            <input
              type="text"
              placeholder="Agent 검색"
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

          <div className="agent-list">
            {filteredAgents.length >
            0 ? (
              filteredAgents.map(
                (agent) => (
                  <div
                    key={
                      agent.id
                    }
                    style={{
                      position:
                        "relative",
                    }}
                  >
                    <AgentCard
                      agent={
                        agent
                      }
                      selected={
                        agent.id ===
                        selectedAgentId
                      }
                      onClick={() =>
                        setSelectedAgentId(
                          agent.id,
                        )
                      }
                    />

                    {dirtyAgentIds.has(
                      agent.id,
                    ) && (
                      <span
                        title="저장되지 않은 변경사항"
                        style={{
                          position:
                            "absolute",

                          top:
                            "8px",

                          right:
                            "8px",

                          width:
                            "7px",

                          height:
                            "7px",

                          borderRadius:
                            "999px",

                          background:
                            "#f59e0b",
                        }}
                      />
                    )}
                  </div>
                ),
              )
            ) : (
              <div className="agent-list__empty">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </aside>

        <AgentEditor
          agent={
            selectedAgent
          }
          isDirty={
            selectedAgent
              ? dirtyAgentIds.has(
                  selectedAgent.id,
                )
              : false
          }
          onChange={
            handleAgentChange
          }
          onDelete={() => {
            void handleDelete();
          }}
        />
      </div>
    </div>
  );
}

function isSameAgentConfiguration(
  first: Agent,
  second: Agent,
) {
  return (
    first.name ===
      second.name &&
    (
      first.description ??
      ""
    ) ===
      (
        second.description ??
        ""
      ) &&
    first.modelId ===
      second.modelId &&
    first.enabled ===
      second.enabled &&
    isSameStringArray(
      first.toolIds,
      second.toolIds,
    )
  );
}

function isSameStringArray(
  first: string[],
  second: string[],
) {
  if (
    first.length !==
    second.length
  ) {
    return false;
  }

  const firstSorted =
    [...first].sort();

  const secondSorted =
    [...second].sort();

  return firstSorted.every(
    (
      value,
      index,
    ) =>
      value ===
      secondSorted[
        index
      ],
  );
}