import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { User, Briefcase, CheckCircle, ArrowRight, ArrowLeft, Mail, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/auth.service';
import { workspaceService } from '../../services/workspace.service';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { toast } from 'sonner';

const onboardingSchema = z.object({
  name: z.string().min(2, 'Workspace name is required'),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const { addWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [workspaceType, setWorkspaceType] = useState<'personal' | 'team'>('personal');
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [inviteEmailInput, setInviteEmailInput] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: `${user?.name}'s Workspace`,
    },
  });

  const onSubmit = async (data: OnboardingFormData) => {
    setIsLoading(true);
    try {
      const workspace = await workspaceService.create({
        name: data.name,
        color: workspaceType === 'personal' ? '#6366f1' : '#f59e0b',
      });
      addWorkspace(workspace);
      setCurrentWorkspace(workspace);
      setCreatedWorkspaceId(workspace._id);

      if (workspaceType === 'personal') {
        await completeOnboarding();
        toast.success('Welcome to NexSpace!');
        navigate('/dashboard');
      } else {
        setStep(3);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await authService.completeOnboarding();
    } catch {
      // Non-blocking — onboarding flag is best-effort
    }
  };

  const handleAddInviteEmail = () => {
    const email = inviteEmailInput.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email');
      return;
    }
    if (inviteEmails.includes(email)) {
      toast.error('Email already added');
      return;
    }
    setInviteEmails([...inviteEmails, email]);
    setInviteEmailInput('');
  };

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      for (const email of inviteEmails) {
        try {
          await workspaceService.inviteMember(createdWorkspaceId!, email);
        } catch {
          // Continue inviting others even if one fails
        }
      }
      await completeOnboarding();
      toast.success('Welcome to NexSpace!');
      navigate('/dashboard');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s <= step
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s < step ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 mx-2 rounded transition-colors ${
                    s < step ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-sm border p-8"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome, {user?.name}!</h2>
              <p className="text-gray-500 mt-1">Let's get your workspace setup</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setWorkspaceType('personal');
                  setStep(2);
                }}
                className="p-6 border-2 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left"
              >
                <User className="w-8 h-8 text-indigo-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Personal</h3>
                <p className="text-sm text-gray-500">For yourself</p>
              </button>

              <button
                onClick={() => {
                  setWorkspaceType('team');
                  setStep(2);
                }}
                className="p-6 border-2 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left"
              >
                <Briefcase className="w-8 h-8 text-orange-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Team</h3>
                <p className="text-sm text-gray-500">For your team or company</p>
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-sm border p-8"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Name your workspace</h2>
              <p className="text-gray-500 mt-1">
                This could be your team or company name
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                {...register('name')}
                placeholder="Workspace name"
                error={errors.name?.message}
                className="text-lg"
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>

                <Button type="submit" className="flex-1" loading={isLoading}>
                  {workspaceType === 'team' ? 'Continue' : 'Create workspace'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-sm border p-8"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Invite your team</h2>
              <p className="text-gray-500 mt-1">
                Add colleagues to your workspace (optional)
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={inviteEmailInput}
                    onChange={(e) => setInviteEmailInput(e.target.value)}
                    className="pl-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInviteEmail();
                      }
                    }}
                  />
                </div>
                <Button type="button" variant="outline" onClick={handleAddInviteEmail}>
                  Add
                </Button>
              </div>

              {inviteEmails.length > 0 && (
                <div className="space-y-2">
                  {inviteEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700">{email}</span>
                      <button
                        onClick={() => setInviteEmails(inviteEmails.filter((e) => e !== email))}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button type="button" className="flex-1" loading={isLoading} onClick={handleFinish}>
                  {inviteEmails.length > 0 ? 'Send invites & finish' : 'Skip & finish'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
