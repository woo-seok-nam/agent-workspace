import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bot,
  Plus,
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
  const [
    agents,
    setAgents,
  ] = useState<Agent[]>([]);

  const [
    selectedAgentId,
    setSelectedAgentId,
  ] = useState<string | null>(
    null,
  );

  const [
    draftAgent,
    setDraftAgent,
  ] = useState<
    Agent | undefined
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
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const data =
          await fetchAgents();

        setAgents(
          data,
        );

        const firstAgent =
          data[0];

        if (firstAgent) {
          setSelectedAgentId(
            firstAgent.id,
          );

          setDraftAgent(
            structuredClone(
              firstAgent,
            ),
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Agent 목록을 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  useEffect(() => {
    const selected =
      agents.find(
        (agent) =>
          agent.id ===
          selectedAgentId,
      );

    setDraftAgent(
      selected
        ? structuredClone(
            selected,
          )
        : undefined,
    );
  }, [
    selectedAgentId,
    agents,
  ]);

  const filteredAgents =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return agents;
      }

      return agents.filter(
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
      agents,
      search,
    ]);

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

            enabled: true,
          });

        setAgents(
          (current) => [
            ...current,
            newAgent,
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

  const handleSave =
    async () => {
      if (!draftAgent) {
        return;
      }

      if (
        !draftAgent.name.trim()
      ) {
        window.alert(
          "Agent 이름을 입력하세요.",
        );

        return;
      }

      try {
        const savedAgent =
          await updateAgent(
            draftAgent.id,
            {
              name:
                draftAgent.name.trim(),

              description:
                draftAgent.description,

              modelId:
                draftAgent.modelId,

              toolIds:
                draftAgent.toolIds,

              enabled:
                draftAgent.enabled,
            },
          );

        setAgents(
          (current) =>
            current.map(
              (agent) =>
                agent.id ===
                savedAgent.id
                  ? savedAgent
                  : agent,
            ),
        );

        setDraftAgent(
          structuredClone(
            savedAgent,
          ),
        );

        window.alert(
          "Agent가 저장되었습니다.",
        );
      } catch (saveError) {
        window.alert(
          saveError instanceof Error
            ? saveError.message
            : "Agent 저장에 실패했습니다.",
        );
      }
    };

  const handleDelete =
    async () => {
      if (!draftAgent) {
        return;
      }

      const confirmed =
        window.confirm(
          `"${draftAgent.name}" Agent를 삭제하시겠습니까?`,
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteAgent(
          draftAgent.id,
        );

        const nextAgents =
          agents.filter(
            (agent) =>
              agent.id !==
              draftAgent.id,
          );

        setAgents(
          nextAgents,
        );

        setSelectedAgentId(
          nextAgents[0]?.id ??
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
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            void handleCreateAgent();
          }}
        >
          <Plus size={15} />
          New Agent
        </button>
      </header>

      <div className="agent-management-layout">
        <aside className="agent-list-panel">
          <div className="agent-list-panel__header">
            <div>
              <Bot size={15} />

              <strong>
                Agents
              </strong>
            </div>

            <span>
              {agents.length}
            </span>
          </div>

          <div className="agent-search">
            <Search
              size={14}
            />

            <input
              type="text"
              placeholder="Agent 검색"
              value={search}
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
                  <AgentCard
                    key={
                      agent.id
                    }
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
            draftAgent
          }
          onChange={
            setDraftAgent
          }
          onSave={() => {
            void handleSave();
          }}
          onDelete={() => {
            void handleDelete();
          }}
        />
      </div>
    </div>
  );
}