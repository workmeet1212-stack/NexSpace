import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { redis, RedisKeys, TTL } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface DecodedToken {
  userId: string;
  type: string;
}

interface SocketData {
  userId: string;
  projectId?: string;
  workspaceId?: string;
}

export const initializeSocket = (httpServer: any): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as DecodedToken;
      socket.data.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  const connectedUsers = new Map<string, Set<string>>(); // projectId -> Set of userIds

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    logger.info(`Socket connected: ${socket.id} (User: ${userId})`);

    // Join workspace room
    socket.on('join:workspace', (workspaceId: string) => {
      socket.join(`workspace:${workspaceId}`);
      logger.debug(`User ${userId} joined workspace ${workspaceId}`);
    });

    // Leave workspace room
    socket.on('leave:workspace', (workspaceId: string) => {
      socket.leave(`workspace:${workspaceId}`);
    });

    // Join project room
    socket.on('join:project', async (projectId: string) => {
      socket.join(`project:${projectId}`);
      socket.data.projectId = projectId;

      // Add to presence set in Redis
      await redis.sadd(`presence:${projectId}`, userId);
      await redis.expire(`presence:${projectId}`, TTL.PRESENCE);

      // Track connected users
      if (!connectedUsers.has(projectId)) {
        connectedUsers.set(projectId, new Set());
      }
      connectedUsers.get(projectId)!.add(userId);

      // Notify others
      socket.to(`project:${projectId}`).emit('member:online', {
        userId,
        projectId,
        timestamp: new Date().toISOString(),
      });

      // Send current presence list to the joiner
      const onlineUsers = await redis.smembers(`presence:${projectId}`);
      socket.emit('presence:update', { projectId, onlineUsers });
    });

    // Leave project room
    socket.on('leave:project', async (projectId: string) => {
      socket.leave(`project:${projectId}`);
      socket.data.projectId = undefined;

      // Remove from presence set
      await redis.srem(`presence:${projectId}`, userId);
      connectedUsers.get(projectId)?.delete(userId);

      // Notify others
      socket.to(`project:${projectId}`).emit('member:offline', {
        userId,
        projectId,
        timestamp: new Date().toISOString(),
      });
    });

    // Task viewing event
    socket.on('task:viewing', ({ taskId, projectId }: { taskId: string; projectId: string }) => {
      socket.to(`project:${projectId}`).emit('presence:viewing', {
        userId,
        taskId,
        timestamp: new Date().toISOString(),
      });
    });

    // User typing indicator
    socket.on('user:typing', ({ taskId, projectId }: { taskId: string; projectId?: string }) => {
      const room = projectId ? `project:${projectId}` : `task:${taskId}`;
      socket.to(room).emit('user:typing', {
        userId,
        taskId,
        timestamp: new Date().toISOString(),
      });
    });

    // Stop typing
    socket.on('user:stop-typing', ({ taskId, projectId }: { taskId: string; projectId?: string }) => {
      const room = projectId ? `project:${projectId}` : `task:${taskId}`;
      socket.to(room).emit('user:stop-typing', {
        userId,
        taskId,
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id} (User: ${userId})`);

      // Remove from all presence sets
      const projectId = socket.data.projectId;
      if (projectId) {
        await redis.srem(`presence:${projectId}`, userId);
        connectedUsers.get(projectId)?.delete(userId);

        // Notify others
        socket.to(`project:${projectId}`).emit('member:offline', {
          userId,
          projectId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  });

  return io;
};

// Helper function to emit to a specific project room
export const emitToProject = (
  io: Server,
  projectId: string,
  event: string,
  data: any
): void => {
  io.to(`project:${projectId}`).emit(event, data);
};

// Helper function to emit to a specific workspace room
export const emitToWorkspace = (
  io: Server,
  workspaceId: string,
  event: string,
  data: any
): void => {
  io.to(`workspace:${workspaceId}`).emit(event, data);
};

// Helper function to emit to a specific user
export const emitToUser = (
  io: Server,
  userId: string,
  event: string,
  data: any
): void => {
  // Find all sockets for this user and emit to them
  const sockets = Array.from(io.sockets.sockets.values()).filter(
    (socket) => socket.data.userId === userId
  );
  sockets.forEach((socket) => socket.emit(event, data));
};

export default initializeSocket;
