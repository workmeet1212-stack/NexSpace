import api from './api';
import { Project, CreateProjectData, TaskStatus } from '../types/project.types';

export const projectService = {
  async create(data: CreateProjectData): Promise<Project> {
    const response = await api.post('/projects', data);
    return response.data.data;
  },

  async getByWorkspace(workspaceId: string): Promise<Project[]> {
    const response = await api.get(`/projects/workspace/${workspaceId}`);
    return response.data.data;
  },

  async getById(projectId: string): Promise<Project> {
    const response = await api.get(`/projects/${projectId}`);
    return response.data.data;
  },

  async update(projectId: string, data: Partial<Project>): Promise<Project> {
    const response = await api.patch(`/projects/${projectId}`, data);
    return response.data.data;
  },

  async delete(projectId: string): Promise<void> {
    await api.delete(`/projects/${projectId}`);
  },

  async updateStatuses(projectId: string, statuses: TaskStatus[]): Promise<TaskStatus[]> {
    const response = await api.patch(`/projects/${projectId}/statuses`, { statuses });
    return response.data.data;
  },

  async addMember(projectId: string, userId: string, role?: string): Promise<void> {
    await api.post(`/projects/${projectId}/members`, { userId, role });
  },

  async removeMember(projectId: string, memberId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/members/${memberId}`);
  },
};
