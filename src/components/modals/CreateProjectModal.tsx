import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus, ChevronDown, Check } from 'lucide-react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useProjectStore } from '../../store/projectStore';
import api from '../../services/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from 'sonner';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

const icons = ['📋', '🚀', '🎯', '💻', '🐛', '📊', '🗂️', '📈'];

const templates = [
  { id: 'kanban', name: 'Kanban Board', description: 'Visual workflow management' },
  { id: 'scrum', name: 'Scrum', description: 'Sprints and backlogs' },
  { id: 'bug-tracking', name: 'Bug Tracking', description: 'Track issues and bugs' },
  { id: 'custom', name: 'Custom', description: 'Start from scratch' },
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspaceStore();
  const { addProject, setCurrentProject } = useProjectStore();
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('📋');
  const [template, setTemplate] = useState('kanban');
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showIconDropdown, setShowIconDropdown] = useState(false);

  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/projects', data);
      return response.data.data;
    },
    onSuccess: (project) => {
      addProject(project);
      setCurrentProject(project);
      queryClient.invalidateQueries({ queryKey: ['projects', currentWorkspace?._id] });
      toast.success('Project created successfully');
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create project');
    },
  });

  const handleClose = () => {
    setName('');
    setIdentifier('');
    setDescription('');
    setColor('#6366f1');
    setIcon('📋');
    setTemplate('kanban');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    if (!currentWorkspace?._id) {
      toast.error('No workspace selected');
      return;
    }

    createProjectMutation.mutate({
      name: name.trim(),
      identifier: identifier.trim().toUpperCase() || undefined,
      description: description.trim() || undefined,
      color,
      icon,
      template,
      workspaceId: currentWorkspace._id,
    });
  };

  // Auto-generate identifier from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!identifier || identifier === name.slice(0, 3).toUpperCase()) {
      setIdentifier(value.slice(0, 3).toUpperCase());
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FolderPlus className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Create new project</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Name & Identifier */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Project name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="My Project"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Key
                </label>
                <Input
                  placeholder="MP"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value.toUpperCase().slice(0, 4))}
                  maxLength={4}
                  className="w-full font-mono uppercase"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                placeholder="What's this project about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Color & Icon */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Color</label>
                <button
                  type="button"
                  onClick={() => setShowColorDropdown(!showColorDropdown)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {colors.find((c) => c.value === color)?.name}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showColorDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 grid grid-cols-4 gap-1">
                    {colors.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          setColor(c.value);
                          setShowColorDropdown(false);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${color === c.value ? 'ring-2 ring-offset-1 ring-indigo-500' : ''}`}
                        style={{ backgroundColor: c.value }}
                      >
                        {color === c.value && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Icon</label>
                <button
                  type="button"
                  onClick={() => setShowIconDropdown(!showIconDropdown)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span>Icon</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showIconDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 grid grid-cols-4 gap-1">
                    {icons.map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setIcon(i);
                          setShowIconDropdown(false);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-gray-100 ${icon === i ? 'bg-indigo-100' : ''}`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Template
              </label>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      template === t.id
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-700">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              loading={createProjectMutation.isPending}
              disabled={!name.trim()}
            >
              Create project
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateProjectModal;
