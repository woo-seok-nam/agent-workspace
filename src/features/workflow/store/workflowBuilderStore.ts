import { create } from "zustand";

import type {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from "../types";

interface WorkflowBuilderState {
  workflowId: string | null;

  name: string;

  nodes: WorkflowNode[];

  edges: WorkflowEdge[];

  selectedNodeId: string | null;

  isDirty: boolean;

  initializeWorkflow: (workflow: Workflow) => void;

  selectNode: (nodeId: string | null) => void;

  updateNode: (
    nodeId: string,
    updates: Partial<WorkflowNode>,
  ) => void;

  updateNodePosition: (
    nodeId: string,
    position: {
      x: number;
      y: number;
    },
  ) => void;

  addEdge: (edge: WorkflowEdge) => void;

  removeEdge: (edgeId: string) => void;

  reset: () => void;
}

const initialState = {
  workflowId: null,
  name: "",
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isDirty: false,
};

export const useWorkflowBuilderStore =
  create<WorkflowBuilderState>((set) => ({
    ...initialState,

    initializeWorkflow: (workflow) => {
      set({
        workflowId: workflow.id,
        name: workflow.name,

        nodes: structuredClone(workflow.nodes),
        edges: structuredClone(workflow.edges),

        selectedNodeId: null,
        isDirty: false,
      });
    },

    selectNode: (nodeId) => {
      set({
        selectedNodeId: nodeId,
      });
    },

    updateNode: (nodeId, updates) => {
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                ...updates,
              }
            : node,
        ),

        isDirty: true,
      }));
    },

    updateNodePosition: (nodeId, position) => {
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                position,
              }
            : node,
        ),

        isDirty: true,
      }));
    },

    addEdge: (edge) => {
      set((state) => ({
        edges: [...state.edges, edge],

        isDirty: true,
      }));
    },

    removeEdge: (edgeId) => {
      set((state) => ({
        edges: state.edges.filter(
          (edge) => edge.id !== edgeId,
        ),

        isDirty: true,
      }));
    },

    reset: () => {
      set(initialState);
    },
  }));