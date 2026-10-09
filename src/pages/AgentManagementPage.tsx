import {
  useEffect,
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
  getAgents,
  getEnabledModels,
  saveAgents,
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
  ] =
    useState<Agent[]>(
      getAgents,
    );

  const [
    selectedAgentId,
    setSelectedAgentId,
  ] =
    useState<
      string | null
    >(
      agents[0]?.id ??
        null,
    );

  const [
    draftAgent,
    setDraftAgent,
  ] =
    useState<
      Agent | undefined
    >(
      agents[0]
        ? structuredClone(
            agents[0],
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
    agents.filter(
      (agent) => {
        const keyword =
          search
            .trim()
            .toLowerCase();

        if (!keyword) {
          return true;
        }

        return (
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
            )
        );
      },
    );

  const handleCreateAgent = () => {
    const defaultModel =
      getEnabledModels()[0];

    if (!defaultModel) {
      window.alert(
        "사용 가능한 Model이 없습니다.",
      );

      return;
    }

    const now =
      new Date().toISOString();

    const newAgent: Agent = {
      id:
        `agent-${crypto.randomUUID()}`,

      name:
        "New Agent",

      description:
        "새로운 AI Agent",

      modelId:
        defaultModel.id,

      toolIds: [],

      enabled: true,

      createdAt: now,

      updatedAt: now,
    };

    const nextAgents = [
      ...agents,
      newAgent,
    ];

    setAgents(
      nextAgents,
    );

    saveAgents(
      nextAgents,
    );

    setSelectedAgentId(
      newAgent.id,
    );

    setDraftAgent(
      structuredClone(
        newAgent,
      ),
    );
  };

  const handleSave = () => {
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

    const nextAgent: Agent = {
      ...draftAgent,

      name:
        draftAgent.name.trim(),

      updatedAt:
        new Date().toISOString(),
    };

    const nextAgents =
      agents.map(
        (agent) =>
          agent.id ===
          nextAgent.id
            ? nextAgent
            : agent,
      );

    setAgents(
      nextAgents,
    );

    setDraftAgent(
      structuredClone(
        nextAgent,
      ),
    );

    saveAgents(
      nextAgents,
    );

    window.alert(
      "Agent가 저장되었습니다.",
    );
  };

  const handleDelete = () => {
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

    const nextAgents =
      agents.filter(
        (agent) =>
          agent.id !==
          draftAgent.id,
      );

    setAgents(
      nextAgents,
    );

    saveAgents(
      nextAgents,
    );

    const nextSelected =
      nextAgents[0];

    setSelectedAgentId(
      nextSelected?.id ??
        null,
    );

    setDraftAgent(
      nextSelected
        ? structuredClone(
            nextSelected,
          )
        : undefined,
    );
  };

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
          onClick={
            handleCreateAgent
          }
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
          onSave={
            handleSave
          }
          onDelete={
            handleDelete
          }
        />
      </div>
    </div>
  );
}