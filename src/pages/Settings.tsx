import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getInitials } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';
import { authApi, ApiError } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  HelpCircle,
  LogOut,
  Camera,
  Mail,
  Phone,
  Loader2
} from 'lucide-react';

const Settings = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [reminderNotifications, setReminderNotifications] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Password change dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
      setEmailNotifications(user.notifications?.email ?? true);
      setPushNotifications(user.notifications?.push ?? true);
      setReminderNotifications(user.notifications?.reminders ?? true);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await authApi.updateProfile({ name, phone: phone || undefined });

      toast({
        title: 'Success!',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all password fields',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'New password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'New passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setPasswordLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });

      toast({
        title: 'Success!',
        description: 'Password changed successfully',
      });

      // Reset form and close dialog
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to change password',
        variant: 'destructive',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setNotificationsLoading(true);
    try {
      await authApi.updateNotifications({
        email: emailNotifications,
        push: pushNotifications,
        reminders: reminderNotifications,
      });

      toast({
        title: 'Success!',
        description: 'Notification preferences updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to update notifications',
        variant: 'destructive',
      });
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="max-w-3xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <div className="flex items-center gap-2 mb-6">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" className="gap-2" disabled>
                <Camera className="h-4 w-4" />
                Change Photo
              </Button>
            </div>

            {/* Form */}
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    className="pl-10"
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    placeholder="Optional"
                    disabled={loading}
                  />
                </div>
              </div>
              <Button
                variant="accent"
                className="mt-2"
                onClick={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
                disabled={notificationsLoading}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-foreground">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Receive real-time updates</p>
              </div>
              <Switch
                checked={pushNotifications}
                onCheckedChange={setPushNotifications}
                disabled={notificationsLoading}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-foreground">Payment Reminders</p>
                <p className="text-sm text-muted-foreground">Get notified about pending dues</p>
              </div>
              <Switch
                checked={reminderNotifications}
                onCheckedChange={setReminderNotifications}
                disabled={notificationsLoading}
              />
            </div>
            <Button
              variant="accent"
              className="mt-4"
              onClick={handleSaveNotifications}
              disabled={notificationsLoading}
            >
              {notificationsLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Security</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Change Password</p>
                <p className="text-sm text-muted-foreground">Update your account password</p>
              </div>
              <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Change</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        disabled={passwordLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={passwordLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={passwordLoading}
                      />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setPasswordDialogOpen(false)}
                        disabled={passwordLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="accent"
                        className="flex-1"
                        onClick={handleChangePassword}
                        disabled={passwordLoading}
                      >
                        {passwordLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Changing...
                          </>
                        ) : (
                          'Change Password'
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <Button variant="outline" disabled>Enable</Button>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Currency</p>
                <p className="text-sm text-muted-foreground">Default: Indian Rupee (₹)</p>
              </div>
              <Button variant="outline" disabled>INR</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Language</p>
                <p className="text-sm text-muted-foreground">Display language</p>
              </div>
              <Button variant="outline" disabled>English</Button>
            </div>
          </div>
        </div>

        {/* Help & Danger Zone */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="outline" className="gap-2 flex-1" disabled>
            <HelpCircle className="h-4 w-4" />
            Help & Support
          </Button>
          <Button variant="destructive" className="gap-2 flex-1" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
