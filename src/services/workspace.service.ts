import api from './api';
import { Workspace, CreateWorkspaceData } from '../types/workspace.types';

export const workspaceService = {
  async create(data: CreateWorkspaceData): Promise<Workspace> {
    const response = await api.post('/workspaces', data);
    return response.data.data;
  },

  async getAll(): Promise<Workspace[]> {
    const response = await api.get('/workspaces');
    return response.data.data;
  },

  async getBySlug(slug: string): Promise<Workspace> {
    const response = await api.get(`/workspaces/${slug}`);
    return response.data.data;
  },

  async update(id: string, data: Partial<CreateWorkspaceData>): Promise<Workspace> {
    const response = await api.patch(`/workspaces/${id}`, data);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/workspaces/${id}`);
  },

  async getMembers(workspaceId: string): Promise<any[]> {
    const response = await api.get(`/workspaces/${workspaceId}/members`);
    return response.data.data;
  },

  async inviteMember(workspaceId: string, email: string, role?: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/members/invite`, { email, role });
  },

  async changeMemberRole(workspaceId: string, memberId: string, role: string): Promise<void> {
    await api.patch(`/workspaces/${workspaceId}/members/${memberId}`, { role });
  },

  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  },

  async acceptInvite(token: string): Promise<{ workspaceId: string }> {
    const response = await api.post(`/workspaces/invite/${token}/accept`);
    return response.data.data;
  },
};
