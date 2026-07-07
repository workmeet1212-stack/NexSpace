import api from './api';
import { Task, CreateTaskData, UpdateTaskData, MoveTaskData } from '../types/task.types';

export const taskService = {
  async create(data: CreateTaskData): Promise<Task> {
    const response = await api.post('/tasks', data);
    return response.data.data;
  },

  async getByProject(projectId: string, params?: Record<string, any>): Promise<Task[]> {
    const response = await api.get(`/tasks/project/${projectId}`, { params });
    return response.data.data.items || response.data.data;
  },

  async getById(taskId: string): Promise<Task> {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data.data;
  },

  async update(taskId: string, data: UpdateTaskData): Promise<Task> {
    const response = await api.patch(`/tasks/${taskId}`, data);
    return response.data.data;
  },

  async bulkUpdate(taskIds: string[], updates: Partial<UpdateTaskData>): Promise<{ modifiedCount: number }> {
    const response = await api.patch('/tasks/bulk', { taskIds, updates });
    return response.data.data;
  },

  async move(taskId: string, data: MoveTaskData): Promise<Task> {
    const response = await api.patch(`/tasks/${taskId}/move`, data);
    return response.data.data;
  },

  async delete(taskId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}`);
  },

  async restore(taskId: string): Promise<Task> {
    const response = await api.post(`/tasks/${taskId}/restore`);
    return response.data.data;
  },

  async getActivity(taskId: string): Promise<any[]> {
    const response = await api.get(`/tasks/${taskId}/activity`);
    return response.data.data;
  },
};
