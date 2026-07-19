import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://nexspace-wsl5.onrender.com';

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinWorkspace(workspaceId: string) {
    this.socket?.emit('join:workspace', workspaceId);
  }

  leaveWorkspace(workspaceId: string) {
    this.socket?.emit('leave:workspace', workspaceId);
  }

  joinProject(projectId: string) {
    this.socket?.emit('join:project', projectId);
  }

  leaveProject(projectId: string) {
    this.socket?.emit('leave:project', projectId);
  }

  startTyping(taskId: string, projectId?: string) {
    this.socket?.emit('user:typing', { taskId, projectId });
  }

  stopTyping(taskId: string, projectId?: string) {
    this.socket?.emit('user:stop-typing', { taskId, projectId });
  }

  on<T>(event: string, callback: (data: T) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string) {
    this.socket?.off(event);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  get connected() {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
export default socketService;
