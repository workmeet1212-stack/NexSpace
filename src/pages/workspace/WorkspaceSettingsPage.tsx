import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import {
  Settings, Info, Palette, CreditCard, AlertTriangle, Trash2, Save, Check
} from 'lucide-react';
import { toast } from 'sonner';

const colors = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Purple', value: '#a855f7' },
];

const WorkspaceSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentWorkspace, updateWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [name, setName] = useState(currentWorkspace?.name || '');
  const [description, setDescription] = useState(currentWorkspace?.description || '');
  const [color, setColor] = useState(currentWorkspace?.color || '#6366f1');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const isOwner = currentWorkspace?.owner._id === user?._id;

  // Update workspace mutation
  const updateWorkspaceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/workspaces/${currentWorkspace?._id}`, data);
      return response.data.data;
    },
    onSuccess: (workspace) => {
      updateWorkspace(currentWorkspace!._id, workspace);
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace updated');
    },
    onError: () => toast.error('Failed to update workspace'),
  });

  // Delete workspace mutation
  const deleteWorkspaceMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/workspaces/${currentWorkspace?._id}`);
    },
    onSuccess: () => {
      toast.success('Workspace deleted');
      navigate('/dashboard');
      window.location.reload();
    },
    onError: () => toast.error('Failed to delete workspace'),
  });

  const handleSave = () => {
    updateWorkspaceMutation.mutate({ name, description, color });
  };

  const handleDelete = () => {
    if (deleteConfirmText === currentWorkspace?.name) {
      deleteWorkspaceMutation.mutate();
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Settings className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workspace Settings</h1>
            <p className="text-sm text-gray-500">Manage your workspace configuration</p>
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
                Workspace name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your team do?"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                loading={updateWorkspaceMutation.isPending}
                disabled={name === currentWorkspace?.name && description === currentWorkspace?.description && color === currentWorkspace?.color}
              >
                <Save className="w-4 h-4 mr-2" />
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 border-b">
            <Palette className="w-5 h-5 text-gray-400" />
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Theme color
            </label>
            <div className="grid grid-cols-4 gap-3">
              {colors.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`h-12 rounded-lg flex items-center justify-center transition-all ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                >
                  {color === c.value && <Check className="w-5 h-5 text-white" />}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-3">
              This color will be used for your workspace icon and branding.
            </p>
          </CardContent>
        </Card>

        {/* Plan */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 border-b">
            <CreditCard className="w-5 h-5 text-gray-400" />
            <CardTitle>Current Plan</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
              <div>
                <p className="font-semibold text-gray-900 flex items-center gap-2">
                  {currentWorkspace?.plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {currentWorkspace?.plan === 'pro'
                    ? 'Unlimited projects, members, and advanced features'
                    : 'Up to 3 projects and 5 members'}
                </p>
              </div>
              {currentWorkspace?.plan !== 'pro' && (
                <Button>Upgrade to Pro</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {isOwner && (
          <Card className="border-red-200">
            <CardHeader className="flex flex-row items-center gap-3 border-b border-red-100 bg-red-50/50">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <CardTitle className="text-red-700">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Delete this workspace</p>
                  <p className="text-sm text-gray-500">
                    Once deleted, it cannot be recovered. All projects and data will be lost.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete workspace
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Workspace</h2>
              <p className="text-gray-600 mb-4">
                This will permanently delete <strong>{currentWorkspace?.name}</strong> and all its projects, tasks, and members.
                Type <strong>{currentWorkspace?.name}</strong> to confirm.
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={currentWorkspace?.name}
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== currentWorkspace?.name}
                  loading={deleteWorkspaceMutation.isPending}
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

export default WorkspaceSettingsPage;
