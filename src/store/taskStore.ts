import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Task } from '../types/task.types';

interface TaskState {
  tasks: Record<string, Task[]>; // projectId -> tasks
  currentTask: Task | null;
  isLoading: boolean;
  setTasks: (projectId: string, tasks: Task[]) => void;
  addTask: (projectId: string, task: Task) => void;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => void;
  removeTask: (projectId: string, taskId: string) => void;
  moveTask: (projectId: string, taskId: string, newStatus: string, newOrder: number) => void;
  setCurrentTask: (task: Task | null) => void;
  reorderTasks: (projectId: string, tasks: Task[]) => void;
}

export const useTaskStore = create<TaskState>()(
  immer((set) => ({
    tasks: {},
    currentTask: null,
    isLoading: false,

    setTasks: (projectId, tasks) =>
      set((state) => {
        state.tasks[projectId] = tasks;
      }),

    addTask: (projectId, task) =>
      set((state) => {
        if (!state.tasks[projectId]) {
          state.tasks[projectId] = [];
        }
        state.tasks[projectId].unshift(task);
      }),

    updateTask: (projectId, taskId, updates) =>
      set((state) => {
        const tasks = state.tasks[projectId];
        if (tasks) {
          const idx = tasks.findIndex((t) => t._id === taskId);
          if (idx !== -1) {
            state.tasks[projectId][idx] = { ...tasks[idx], ...updates };
          }
        }
        if (state.currentTask?._id === taskId) {
          state.currentTask = { ...state.currentTask, ...updates };
        }
      }),

    removeTask: (projectId, taskId) =>
      set((state) => {
        if (state.tasks[projectId]) {
          state.tasks[projectId] = state.tasks[projectId].filter(
            (t) => t._id !== taskId
          );
        }
        if (state.currentTask?._id === taskId) {
          state.currentTask = null;
        }
      }),

    moveTask: (projectId, taskId, newStatus, newOrder) =>
      set((state) => {
        const tasks = state.tasks[projectId];
        if (tasks) {
          const idx = tasks.findIndex((t) => t._id === taskId);
          if (idx !== -1) {
            state.tasks[projectId][idx].status = newStatus;
            state.tasks[projectId][idx].order = newOrder;
          }
        }
      }),

    setCurrentTask: (task) => set({ currentTask: task }),

    reorderTasks: (projectId, tasks) =>
      set((state) => {
        state.tasks[projectId] = tasks;
      }),
  }))
);
