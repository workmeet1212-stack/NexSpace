import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  taskDrawerOpen: boolean;
  commandPaletteOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTaskDrawerOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  taskDrawerOpen: false,
  commandPaletteOpen: false,
  theme: 'system',

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  setTaskDrawerOpen: (open) => set({ taskDrawerOpen: open }),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  setTheme: (theme) => set({ theme }),
}));
