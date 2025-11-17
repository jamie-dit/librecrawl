import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Settings as SettingsIcon,
  Lock,
  Loader2,
  Save,
  Mail,
  Calendar,
  Shield,
  Globe,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { authApi, userApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface SettingsFormData {
  defaultDelay: number;
  defaultDepth: number;
  followExternal: boolean;
  jsRendering: boolean;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await userApi.getSettings();
      return response.data;
    },
  });

  // Settings form
  const {
    register: registerSettings,
    handleSubmit: handleSettingsSubmit,
    setValue: setSettingsValue,
    watch: watchSettings,
    formState: { errors: settingsErrors },
  } = useForm<SettingsFormData>({
    defaultValues: {
      defaultDelay: settingsData?.settings?.defaultDelay || 1000,
      defaultDepth: settingsData?.settings?.defaultDepth || 3,
      followExternal: settingsData?.settings?.followExternal || false,
      jsRendering: settingsData?.settings?.jsRendering || false,
    },
  });

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
    watch: watchPassword,
  } = useForm<PasswordFormData>();

  // Update form values when settings data is loaded
  useEffect(() => {
    if (settingsData?.settings) {
      setSettingsValue('defaultDelay', settingsData.settings.defaultDelay || 1000);
      setSettingsValue('defaultDepth', settingsData.settings.defaultDepth || 3);
      setSettingsValue('followExternal', settingsData.settings.followExternal || false);
      setSettingsValue('jsRendering', settingsData.settings.jsRendering || false);
    }
  }, [settingsData, setSettingsValue]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      return await userApi.updateSettings(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({
        title: 'Settings updated!',
        description: 'Your preferences have been saved successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update settings',
        description: error.response?.data?.error || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      return await authApi.updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      resetPasswordForm();
      toast({
        title: 'Password updated!',
        description: 'Your password has been changed successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update password',
        description: error.response?.data?.error || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  const onSettingsSubmit = async (data: SettingsFormData) => {
    updateSettingsMutation.mutate(data);
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmNewPassword) {
      toast({
        title: 'Password mismatch',
        description: 'New password and confirmation do not match',
        variant: 'destructive',
      });
      return;
    }

    if (data.newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long',
        variant: 'destructive',
      });
      return;
    }

    updatePasswordMutation.mutate(data);
  };

  const followExternal = watchSettings('followExternal');
  const jsRendering = watchSettings('jsRendering');

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'premium':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500';
      case 'pro':
        return 'bg-gradient-to-r from-blue-500 to-purple-500';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600';
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="container mx-auto px-4 py-12 relative">
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom duration-500">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <SettingsIcon className="h-10 w-10" />
              Settings
            </h1>
            <p className="text-xl text-blue-100">
              Manage your account preferences and crawl defaults
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl border-none backdrop-blur-sm bg-background/95 animate-in fade-in slide-in-from-left duration-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex justify-center">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-4xl font-bold text-white">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* User Info */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-xl font-bold">{user?.username}</h3>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>

                  <Separator />

                  {/* Tier Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Tier</span>
                    </div>
                    <Badge className={`${getTierColor(user?.tier || 'free')} text-white font-semibold px-3 py-1`}>
                      {user?.tier?.toUpperCase() || 'FREE'}
                    </Badge>
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Email</span>
                    </div>
                    <span className="text-sm font-medium truncate max-w-[150px]">
                      {user?.email}
                    </span>
                  </div>

                  {/* Member Since */}
                  {settingsData?.user?.createdAt && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Member Since</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatDistanceToNow(new Date(settingsData.user.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Tabs */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-none backdrop-blur-sm bg-background/95 animate-in fade-in slide-in-from-right duration-500">
              <CardHeader>
                <CardTitle className="text-2xl">Account Settings</CardTitle>
                <CardDescription>
                  Customize your crawling preferences and security settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="crawl-defaults" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="crawl-defaults" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Crawl Defaults
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Security
                    </TabsTrigger>
                  </TabsList>

                  {/* Crawl Defaults Tab */}
                  <TabsContent value="crawl-defaults" className="space-y-6 mt-6">
                    <form onSubmit={handleSettingsSubmit(onSettingsSubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Zap className="h-4 w-4" />
                          <p>These settings will be used as defaults for new crawls</p>
                        </div>

                        <Separator />

                        {/* Default Delay */}
                        <div className="space-y-2">
                          <Label htmlFor="defaultDelay" className="text-base font-semibold">
                            Default Delay (ms)
                          </Label>
                          <Input
                            id="defaultDelay"
                            type="number"
                            min={0}
                            max={10000}
                            step={100}
                            {...registerSettings('defaultDelay', {
                              valueAsNumber: true,
                              min: { value: 0, message: 'Delay must be at least 0ms' },
                              max: { value: 10000, message: 'Delay cannot exceed 10,000ms' },
                            })}
                            className={settingsErrors.defaultDelay ? 'border-red-500' : ''}
                            disabled={updateSettingsMutation.isPending}
                          />
                          {settingsErrors.defaultDelay && (
                            <p className="text-sm text-red-500">
                              {settingsErrors.defaultDelay.message}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Time to wait between requests (0-10000ms)
                          </p>
                        </div>

                        {/* Default Depth */}
                        <div className="space-y-2">
                          <Label htmlFor="defaultDepth" className="text-base font-semibold">
                            Default Crawl Depth
                          </Label>
                          <Input
                            id="defaultDepth"
                            type="number"
                            min={1}
                            max={10}
                            {...registerSettings('defaultDepth', {
                              valueAsNumber: true,
                              min: { value: 1, message: 'Depth must be at least 1' },
                              max: { value: 10, message: 'Depth cannot exceed 10' },
                            })}
                            className={settingsErrors.defaultDepth ? 'border-red-500' : ''}
                            disabled={updateSettingsMutation.isPending}
                          />
                          {settingsErrors.defaultDepth && (
                            <p className="text-sm text-red-500">
                              {settingsErrors.defaultDepth.message}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            How many levels deep to crawl by default (1-10)
                          </p>
                        </div>

                        <Separator />

                        {/* Switches */}
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-0.5">
                              <Label htmlFor="followExternal" className="text-base font-medium">
                                Follow External Links
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Enable by default for new crawls
                              </p>
                            </div>
                            <Switch
                              id="followExternal"
                              checked={followExternal}
                              onCheckedChange={(checked) =>
                                setSettingsValue('followExternal', checked)
                              }
                              disabled={updateSettingsMutation.isPending}
                            />
                          </div>

                          <div className="flex items-center justify-between space-x-2">
                            <div className="space-y-0.5">
                              <Label htmlFor="jsRendering" className="text-base font-medium">
                                JavaScript Rendering
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Use headless browser by default (slower but more accurate)
                              </p>
                            </div>
                            <Switch
                              id="jsRendering"
                              checked={jsRendering}
                              onCheckedChange={(checked) =>
                                setSettingsValue('jsRendering', checked)
                              }
                              disabled={updateSettingsMutation.isPending}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Save Button */}
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        disabled={updateSettingsMutation.isPending}
                      >
                        {updateSettingsMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Settings
                          </>
                        )}
                      </Button>

                      {updateSettingsMutation.isSuccess && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Settings saved successfully!
                        </div>
                      )}
                    </form>
                  </TabsContent>

                  {/* Security Tab */}
                  <TabsContent value="security" className="space-y-6 mt-6">
                    <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Lock className="h-4 w-4" />
                          <p>Update your password to keep your account secure</p>
                        </div>

                        <Separator />

                        {/* Current Password */}
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword" className="text-base font-semibold">
                            Current Password *
                          </Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            placeholder="••••••••"
                            {...registerPassword('currentPassword', {
                              required: 'Current password is required',
                            })}
                            className={passwordErrors.currentPassword ? 'border-red-500' : ''}
                            disabled={updatePasswordMutation.isPending}
                          />
                          {passwordErrors.currentPassword && (
                            <p className="text-sm text-red-500">
                              {passwordErrors.currentPassword.message}
                            </p>
                          )}
                        </div>

                        {/* New Password */}
                        <div className="space-y-2">
                          <Label htmlFor="newPassword" className="text-base font-semibold">
                            New Password *
                          </Label>
                          <Input
                            id="newPassword"
                            type="password"
                            placeholder="••••••••"
                            {...registerPassword('newPassword', {
                              required: 'New password is required',
                              minLength: {
                                value: 6,
                                message: 'Password must be at least 6 characters',
                              },
                            })}
                            className={passwordErrors.newPassword ? 'border-red-500' : ''}
                            disabled={updatePasswordMutation.isPending}
                          />
                          {passwordErrors.newPassword && (
                            <p className="text-sm text-red-500">
                              {passwordErrors.newPassword.message}
                            </p>
                          )}
                        </div>

                        {/* Confirm New Password */}
                        <div className="space-y-2">
                          <Label htmlFor="confirmNewPassword" className="text-base font-semibold">
                            Confirm New Password *
                          </Label>
                          <Input
                            id="confirmNewPassword"
                            type="password"
                            placeholder="••••••••"
                            {...registerPassword('confirmNewPassword', {
                              required: 'Please confirm your new password',
                              validate: (value) =>
                                value === watchPassword('newPassword') ||
                                'Passwords do not match',
                            })}
                            className={passwordErrors.confirmNewPassword ? 'border-red-500' : ''}
                            disabled={updatePasswordMutation.isPending}
                          />
                          {passwordErrors.confirmNewPassword && (
                            <p className="text-sm text-red-500">
                              {passwordErrors.confirmNewPassword.message}
                            </p>
                          )}
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-blue-900 dark:text-blue-100">
                            <strong>Password requirements:</strong>
                          </p>
                          <ul className="text-xs text-blue-800 dark:text-blue-200 mt-2 space-y-1 list-disc list-inside">
                            <li>At least 6 characters long</li>
                            <li>Use a unique password you don't use elsewhere</li>
                          </ul>
                        </div>
                      </div>

                      {/* Update Password Button */}
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        disabled={updatePasswordMutation.isPending}
                      >
                        {updatePasswordMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating Password...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Update Password
                          </>
                        )}
                      </Button>

                      {updatePasswordMutation.isSuccess && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Password updated successfully!
                        </div>
                      )}
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes grid {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-10px);
          }
        }
        .bg-grid-white {
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}
