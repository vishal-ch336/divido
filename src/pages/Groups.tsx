import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { GroupCard } from '@/components/dashboard/GroupCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { groupsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { Plus, Search, Users, Loader2, X, User, Trash2, MoreVertical, Receipt } from 'lucide-react';
import { Group } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Groups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const data = await groupsApi.getAll();
      // Transform groups to include debtRelations
      const transformedGroups = (data || []).map((group: any) => ({
        ...group,
        debtRelations: (group.debtRelations || []).map((dr: any) => ({
          fromUser: {
            id: dr.fromUser.id || dr.fromUser._id,
            name: dr.fromUser.name || 'Unknown',
            email: dr.fromUser.email || '',
            avatar: dr.fromUser.avatar,
            createdAt: new Date(),
          },
          toUser: {
            id: dr.toUser.id || dr.toUser._id,
            name: dr.toUser.name || 'Unknown',
            email: dr.toUser.email || '',
            avatar: dr.toUser.avatar,
            createdAt: new Date(),
          },
          amount: dr.amount,
        })),
      }));
      setGroups(transformedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to load groups',
        variant: 'destructive',
      });
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleAddMember = () => {
    const email = memberEmail.trim().toLowerCase();
    
    if (!email) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    if (!validateEmail(email)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    if (user && email === user.email.toLowerCase()) {
      toast({
        title: 'Validation Error',
        description: 'You cannot add yourself as a member',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicates (case-insensitive)
    if (memberEmails.some(e => e.toLowerCase() === email)) {
      toast({
        title: 'Validation Error',
        description: 'This email is already added',
        variant: 'destructive',
      });
      return;
    }

    setMemberEmails([...memberEmails, email]);
    setMemberEmail('');
  };

  const handleRemoveMember = (email: string) => {
    setMemberEmails(memberEmails.filter(e => e !== email));
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!newGroupName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a group name',
        variant: 'destructive',
      });
      return;
    }

    if (newGroupName.trim().length > 100) {
      toast({
        title: 'Validation Error',
        description: 'Group name must be less than 100 characters',
        variant: 'destructive',
      });
      return;
    }

    if (newGroupDescription && newGroupDescription.length > 500) {
      toast({
        title: 'Validation Error',
        description: 'Description must be less than 500 characters',
        variant: 'destructive',
      });
      return;
    }

    // Validate member emails
    const invalidEmails = memberEmails.filter(email => !validateEmail(email));
    if (invalidEmails.length > 0) {
      toast({
        title: 'Validation Error',
        description: `Invalid emails: ${invalidEmails.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const newGroup = await groupsApi.create({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
        currency: 'INR',
        memberEmails: memberEmails.length > 0 ? memberEmails : undefined,
      });

      const memberCount = memberEmails.length > 0 ? ` with ${memberEmails.length} member${memberEmails.length === 1 ? '' : 's'}` : '';
      toast({
        title: 'Success!',
        description: `Group "${newGroup.name}" created successfully${memberCount}`,
      });

      // Reset form
      setNewGroupName('');
      setNewGroupDescription('');
      setMemberEmail('');
      setMemberEmails([]);
      setIsCreateOpen(false);

      // Refresh groups list
      await fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to create group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!loading) {
      setIsCreateOpen(isOpen);
      if (!isOpen) {
        // Reset form when closing
        setNewGroupName('');
        setNewGroupDescription('');
        setMemberEmail('');
        setMemberEmails([]);
      }
    }
  };

  const handleDeleteClick = (group: Group) => {
    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;

    setDeleting(true);
    try {
      await groupsApi.delete(groupToDelete.id);
      toast({
        title: 'Success!',
        description: `Group "${groupToDelete.name}" deleted successfully`,
      });
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
      await fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed to delete group. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Groups</h1>
            <p className="text-muted-foreground mt-1">Manage your expense groups</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button variant="accent" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateGroup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Group Name *</Label>
                  <Input
                    id="groupName"
                    placeholder="e.g., Goa Trip 2024"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    required
                    disabled={loading}
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    {newGroupName.length}/100 characters
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="groupDescription">Description (Optional)</Label>
                  <Textarea
                    id="groupDescription"
                    placeholder="What's this group for?"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    rows={3}
                    disabled={loading}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {newGroupDescription.length}/500 characters
                  </p>
                </div>

                {/* Members Section */}
                <div className="space-y-2">
                  <Label htmlFor="memberEmail">Add Members (Optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Add members by their email addresses. They must have an account.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="memberEmail"
                      type="email"
                      placeholder="Enter member email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMember();
                        }
                      }}
                      disabled={loading}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddMember}
                      disabled={loading || !memberEmail.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Member Email Tags */}
                  {memberEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-lg bg-muted/30">
                      {memberEmails.map((email, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1.5 bg-background border rounded-full text-sm"
                        >
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-foreground">{email}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(email)}
                            disabled={loading}
                            className="ml-1 hover:bg-muted rounded-full p-0.5 transition-colors"
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => handleOpenChange(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="accent" 
                    className="flex-1"
                    disabled={loading || !newGroupName.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Group'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Groups Grid */}
        {loadingGroups ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading groups...</p>
            </div>
          </div>
        ) : filteredGroups.length > 0 ? (
          <div className="space-y-4">
            {filteredGroups.map((group, index) => {
              // Check if user is creator (for delete permission)
              const isCreator = typeof group.createdBy === 'object' 
                ? (group.createdBy.id || group.createdBy._id) === user?.id
                : group.createdBy === user?.id;
              
              // Get debts involving current user
              const userDebts = group.debtRelations?.filter(d => 
                (d.fromUser.id === user?.id || d.toUser.id === user?.id)
              ) || [];
              
              const isPositive = (group.userBalance || 0) > 0;
              const isNegative = (group.userBalance || 0) < 0;
              
              return (
                <Link
                  key={group.id}
                  to={`/groups/${group.id}`}
                  className="block"
                >
                  <div className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Users className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground text-lg">{group.name}</h3>
                            {group.description && (
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{group.description}</p>
                            )}
                          </div>
                          {isCreator && (
                            <div onClick={(e) => e.preventDefault()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteClick(group);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Group
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between border-t border-border pt-4">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Users className="h-4 w-4" />
                              {group.memberCount} members
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Receipt className="h-4 w-4" />
                              {formatCurrency(group.totalExpenses)}
                            </span>
                          </div>
                          <div className={`text-sm font-semibold px-3 py-1 rounded-full ${
                            isPositive ? 'bg-credit-light text-credit' :
                            isNegative ? 'bg-debit-light text-debit' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {isPositive && '+'}
                            {(group.userBalance || 0) !== 0 ? formatCurrency(group.userBalance || 0) : 'Settled'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Debt Summary Preview */}
                    {userDebts.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="text-sm font-medium text-foreground mb-3">Your Balances in this Group</h4>
                        <div className="space-y-2">
                          {userDebts.map((debt, debtIndex) => {
                            const isYouOwe = debt.fromUser.id === user?.id;
                            const otherUser = isYouOwe ? debt.toUser : debt.fromUser;
                            return (
                              <div
                                key={debtIndex}
                                className={`flex items-center justify-between p-3 rounded-lg ${
                                  isYouOwe 
                                    ? 'bg-debit-light/50 border border-debit/10' 
                                    : 'bg-credit-light/50 border border-credit/10'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-foreground">
                                    {isYouOwe ? 'You owe' : 'Owes you'}: <strong>{otherUser.name}</strong>
                                  </span>
                                </div>
                                <span className={`text-sm font-semibold ${
                                  isYouOwe ? 'text-debit' : 'text-credit'
                                }`}>
                                  {formatCurrency(debt.amount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No groups found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first group to get started'}
            </p>
            {!searchQuery && (
              <Button variant="accent" onClick={() => handleOpenChange(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            )}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Group</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{groupToDelete?.name}"? This action cannot be undone and will delete all expenses and activity logs associated with this group.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default Groups;
