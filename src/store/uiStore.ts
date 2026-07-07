import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  taskDrawerOpen: boolean;
  commandPaletteOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTaskDrawerOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  taskDrawerOpen: false,
  commandPaletteOpen: false,
  theme: 'system',

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  setTaskDrawerOpen: (open) => set({ taskDrawerOpen: open }),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  setTheme: (theme) => set({ theme }),
}));
