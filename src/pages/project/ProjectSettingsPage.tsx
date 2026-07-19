import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useProjectStore } from '../../store/projectStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { UserAvatar } from '../../components/common/UserAvatar';
import {
  Settings, Info, Users, Palette, Tags, Trash2, AlertTriangle, Save, ChevronDown, X, Plus
} from 'lucide-react';
import { toast } from 'sonner';

const ProjectSettingsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentProject, updateProject, removeProject } = useProjectStore();
  const { currentWorkspace } = useWorkspaceStore();
  const [name, setName] = useState(currentProject?.name || '');
  const [description, setDescription] = useState(currentProject?.description || '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#6366f1');

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/projects/${projectId}`, data);
      return response.data.data;
    },
    onSuccess: (project) => {
      updateProject(projectId!, project);
      queryClient.invalidateQueries({ queryKey: ['projects', currentWorkspace?._id] });
      toast.success('Project updated');
    },
    onError: () => toast.error('Failed to update project'),
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/projects/${projectId}`);
    },
    onSuccess: () => {
      removeProject(projectId!);
      navigate('/dashboard');
      toast.success('Project deleted');
    },
    onError: () => toast.error('Failed to delete project'),
  });

  // Update member role mutation
  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const response = await api.patch(`/projects/${projectId}/members/${memberId}`, { role });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', currentWorkspace?._id] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member role updated');
    },
    onError: () => toast.error('Failed to update member role'),
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/projects/${projectId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', currentWorkspace?._id] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });

  // Add project member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (data: { userId: string; role?: string }) => {
      const response = await api.post(`/projects/${projectId}/members`, data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', currentWorkspace?._id] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member added successfully');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add member');
    },
  });

  // Update statuses mutation
  const updateStatusesMutation = useMutation({
    mutationFn: async (statuses: { name: string; color: string }[]) => {
      const response = await api.patch(`/projects/${projectId}/statuses`, { statuses });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', currentWorkspace?._id] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Statuses updated');
    },
    onError: () => toast.error('Failed to update statuses'),
  });

  const handleSaveGeneral = () => {
    updateProjectMutation.mutate({ name, description });
  };

  const handleDeleteProject = () => {
    if (deleteConfirmText === currentProject?.name) {
      deleteProjectMutation.mutate();
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    try {
      // First, search for user by email in the workspace
      const searchResponse = await api.get(`/workspaces/${currentWorkspace?._id}/members`, {
        params: { search: inviteEmail.trim() },
      });
      const members = searchResponse.data.data || [];
      const foundMember = members.find(
        (m: any) => m.user?.email?.toLowerCase() === inviteEmail.trim().toLowerCase()
      );

      if (!foundMember) {
        toast.error('User not found in this workspace. Ask them to join the workspace first.');
        return;
      }

      addMemberMutation.mutate({
        userId: foundMember.user._id,
        role: inviteRole,
      });
    } catch {
      toast.error('Failed to search for user');
    }
  };

  const handleAddStatus = () => {
    if (!newStatusName.trim()) {
      toast.error('Status name is required');
      return;
    }
    const currentStatuses = currentProject?.settings?.taskStatuses || [];
    if (currentStatuses.some((s) => s.name.toLowerCase() === newStatusName.trim().toLowerCase())) {
      toast.error('Status already exists');
      return;
    }
    updateStatusesMutation.mutate([
      ...currentStatuses,
      { name: newStatusName.trim(), color: newStatusColor },
    ]);
    setNewStatusName('');
    setNewStatusColor('#6366f1');
    setShowAddStatus(false);
  };

  const projectMembers = currentProject?.members || [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Settings className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Settings</h1>
            <p className="text-sm text-gray-500">Manage your project configuration</p>
          </div>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 border-b">
            <Info className="w-5 h-5 text-gray-400" />
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Project name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this project about?"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveGeneral}
                loading={updateProjectMutation.isPending}
                disabled={name === currentProject?.name && description === currentProject?.description}
              >
                <Save className="w-4 h-4 mr-2" />
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 border-b">
            <Users className="w-5 h-5 text-gray-400" />
            <CardTitle>Members ({projectMembers.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {projectMembers.map((member) => (
                <div
                  key={member.user._id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar name={member.user.name} src={member.user.avatar} size="md" />
                    <div>
                      <p className="font-medium text-gray-900">{member.user.name}</p>
                      <p className="text-sm text-gray-500">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                      defaultValue={member.role}
                      onChange={(e) =>
                        updateMemberRoleMutation.mutate({
                          memberId: member.user._id,
                          role: e.target.value,
                        })
                      }
                    >
                      <option value="lead">Lead</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => removeMemberMutation.mutate(member.user._id)}
                      className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setShowInviteModal(true)}
              >
                <Users className="w-4 h-4 mr-2" />
                Invite member
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statuses */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 border-b">
            <Tags className="w-5 h-5 text-gray-400" />
            <CardTitle>Task Statuses</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {(currentProject?.settings?.taskStatuses || [
                { name: 'Backlog', color: '#94a3b8' },
                { name: 'Todo', color: '#64748b' },
                { name: 'In Progress', color: '#3b82f6' },
                { name: 'In Review', color: '#f59e0b' },
                { name: 'Done', color: '#22c55e' },
              ]).map((status, index) => (
                <div
                  key={status.name}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="font-medium text-gray-700">{status.name}</span>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setShowAddStatus(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add status
            </Button>
            {showAddStatus && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">New Status</span>
                  <button onClick={() => setShowAddStatus(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newStatusColor}
                    onChange={(e) => setNewStatusColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <Input
                    placeholder="Status name"
                    value={newStatusName}
                    onChange={(e) => setNewStatusName(e.target.value)}
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
                  />
                </div>
                <Button size="sm" className="w-full" onClick={handleAddStatus} loading={updateStatusesMutation.isPending}>
                  Add status
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center gap-3 border-b border-red-100 bg-red-50/50">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <CardTitle className="text-red-700">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Delete this project</p>
                <p className="text-sm text-gray-500">
                  Once deleted, it cannot be recovered. All tasks will be lost.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete project
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Project</h2>
              <p className="text-gray-600 mb-4">
                This will permanently delete <strong>{currentProject?.name}</strong> and all its data.
                Type <strong>{currentProject?.name}</strong> to confirm.
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={currentProject?.name}
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteProject}
                  disabled={deleteConfirmText !== currentProject?.name}
                  loading={deleteProjectMutation.isPending}
                >
                  Delete permanently
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Invite Member Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowInviteModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Invite to Project</h2>
                <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                Add a workspace member to <strong>{currentProject?.name}</strong>. They must already be a member of the workspace.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email address
                  </label>
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleInviteMember()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="lead">Lead</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInviteMember}
                  loading={addMemberMutation.isPending}
                  disabled={!inviteEmail.trim()}
                >
                  Add member
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectSettingsPage;
