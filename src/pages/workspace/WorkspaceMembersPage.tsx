import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { UserAvatar } from '../../components/common/UserAvatar';
import { Spinner } from '../../components/ui/Spinner';
import {
  Users, UserPlus, Mail, Shield, Crown, MoreHorizontal, Trash2, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../../utils/formatDate';

const WorkspaceMembersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentWorkspace, updateWorkspace } = useWorkspaceStore();
  const { user: currentUser } = useAuthStore();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin' | 'viewer'>('member');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const memberRole = currentWorkspace?.members?.find(
    (m) => m.user._id === currentUser?._id
  )?.role;

  const isOwner = currentWorkspace?.owner._id === currentUser?._id;
  const canInvite = isOwner || memberRole === 'admin';

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const response = await api.post(`/workspaces/${currentWorkspace?._id}/invite`, { email, role });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', currentWorkspace?._id] });
      toast.success('Invitation sent');
      setInviteEmail('');
      setShowInviteForm(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send invite');
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/workspaces/${currentWorkspace?._id}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', currentWorkspace?._id] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await api.patch(`/workspaces/${currentWorkspace?._id}/members/${userId}/role`, { role });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', currentWorkspace?._id] });
      toast.success('Role updated');
    },
    onError: () => toast.error('Failed to update role'),
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  const members = currentWorkspace?.members || [];
  const owner = currentWorkspace?.owner;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Members</h1>
              <p className="text-sm text-gray-500">{members.length} members in your workspace</p>
            </div>
          </div>
          {canInvite && (
            <Button onClick={() => setShowInviteForm(!showInviteForm)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite member
            </Button>
          )}
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100"
          >
            <h3 className="font-medium mb-3">Invite by email</h3>
            <div className="flex gap-3">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="member@example.com"
                icon={<Mail className="w-4 h-4" />}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
              <Button onClick={handleInvite} loading={inviteMutation.isPending}>
                Send invite
              </Button>
            </div>
          </motion.div>
        )}

        {/* Owner */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Owner
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-100">
              <div className="flex items-center gap-3">
                <UserAvatar name={owner?.name || 'Owner'} src={owner?.avatar} size="lg" />
                <div>
                  <p className="font-medium text-gray-900">{owner?.name}</p>
                  <p className="text-sm text-gray-500">{owner?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                  Owner
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {members.filter((m) => m.user._id !== owner?._id).map((member) => (
                <div
                  key={member.user._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar name={member.user.name} src={member.user.avatar} size="lg" />
                    <div>
                      <p className="font-medium text-gray-900">{member.user.name}</p>
                      <p className="text-sm text-gray-500">{member.user.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Joined {formatDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <select
                        value={member.role}
                        onChange={(e) => {
                          if (e.target.value !== member.role) {
                            updateRoleMutation.mutate({ userId: member.user._id, role: e.target.value });
                          }
                        }}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        member.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                        member.role === 'member' ? 'bg-gray-100 text-gray-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                    )}
                    {isOwner && member.user._id !== currentUser?._id && (
                      <button
                        onClick={() => removeMemberMutation.mutate(member.user._id)}
                        className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {members.filter((m) => m.user._id !== owner?._id).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>No members yet</p>
                  {canInvite && (
                    <Button variant="link" onClick={() => setShowInviteForm(true)}>
                      Invite your first member
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkspaceMembersPage;
