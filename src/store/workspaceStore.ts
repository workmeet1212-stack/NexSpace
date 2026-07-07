import { create } from 'zustand';
import { Workspace } from '../types/workspace.types';
import { workspaceService } from '../services/workspace.service';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  removeWorkspace: (id: string) => void;
  fetchWorkspaces: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  isLoading: false,
  error: null,

  setWorkspaces: (workspaces) => {
    set({ workspaces });
    if (workspaces.length > 0 && !get().currentWorkspace) {
      set({ currentWorkspace: workspaces[0] });
    }
  },

  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

  addWorkspace: (workspace) =>
    set((state) => ({
      workspaces: [...state.workspaces, workspace],
    })),

  updateWorkspace: (id, updates) =>
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws._id === id ? { ...ws, ...updates } : ws
      ),
      currentWorkspace:
        state.currentWorkspace?._id === id
          ? { ...state.currentWorkspace, ...updates }
          : state.currentWorkspace,
    })),

  removeWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((ws) => ws._id !== id),
      currentWorkspace:
        state.currentWorkspace?._id === id ? null : state.currentWorkspace,
    })),

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await workspaceService.getAll();
      set({ workspaces, isLoading: false });
      if (workspaces.length > 0 && !get().currentWorkspace) {
        set({ currentWorkspace: workspaces[0] });
      }
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
