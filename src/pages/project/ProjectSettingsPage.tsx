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
  Settings, Info, Users, Palette, Tags, Trash2, AlertTriangle, Save, ChevronDown
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

  const handleSaveGeneral = () => {
    updateProjectMutation.mutate({ name, description });
  };

  const handleDeleteProject = () => {
    if (deleteConfirmText === currentProject?.name) {
      deleteProjectMutation.mutate();
    }
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
                    >
                      <option value="lead">Lead</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                </div>
              ))}

              <Button variant="outline" className="w-full mt-4">
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
            <Button variant="outline" className="w-full mt-4">
              + Add status
            </Button>
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
      </div>
    </div>
  );
};

export default ProjectSettingsPage;
