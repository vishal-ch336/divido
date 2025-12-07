import { useState, useEffect } from 'react';
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
import { Plus, Search, Users, Loader2, X, User } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy?: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    avatar?: string;
  } | string;
  createdAt: string | Date;
  memberCount: number;
  totalExpenses: number;
  currency: string;
  userBalance: number;
}

const Groups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);

  // Fetch groups on mount
  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const data = await groupsApi.getAll();
      setGroups(data || []);
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

  const validateName = (name: string): boolean => {
    const trimmedName = name.trim();
    return trimmedName.length >= 2 && trimmedName.length <= 100;
  };

  const handleAddMember = () => {
    const name = memberName.trim();
    
    if (!name) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a name',
        variant: 'destructive',
      });
      return;
    }

    if (!validateName(name)) {
      toast({
        title: 'Validation Error',
        description: 'Name must be between 2 and 100 characters',
        variant: 'destructive',
      });
      return;
    }

    if (user && name.toLowerCase() === user.name.toLowerCase()) {
      toast({
        title: 'Validation Error',
        description: 'You cannot add yourself as a member',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicates (case-insensitive)
    if (memberNames.some(n => n.toLowerCase() === name.toLowerCase())) {
      toast({
        title: 'Validation Error',
        description: 'This name is already added',
        variant: 'destructive',
      });
      return;
    }

    setMemberNames([...memberNames, name]);
    setMemberName('');
  };

  const handleRemoveMember = (name: string) => {
    setMemberNames(memberNames.filter(n => n !== name));
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

    // Validate member names
    const invalidNames = memberNames.filter(name => !validateName(name));
    if (invalidNames.length > 0) {
      toast({
        title: 'Validation Error',
        description: `Invalid names: ${invalidNames.join(', ')}`,
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
        memberNames: memberNames.length > 0 ? memberNames : undefined,
      });

      const memberCount = memberNames.length > 0 ? ` with ${memberNames.length} member${memberNames.length === 1 ? '' : 's'}` : '';
      toast({
        title: 'Success!',
        description: `Group "${newGroup.name}" created successfully${memberCount}`,
      });

      // Reset form
      setNewGroupName('');
      setNewGroupDescription('');
      setMemberName('');
      setMemberNames([]);
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
        setMemberName('');
        setMemberNames([]);
      }
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
                  <Label htmlFor="memberName">Add Members (Optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Add members by their names. They must have an account.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="memberName"
                      type="text"
                      placeholder="Enter member name"
                      value={memberName}
                      onChange={(e) => setMemberName(e.target.value)}
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
                      disabled={loading || !memberName.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Member Name Tags */}
                  {memberNames.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-lg bg-muted/30">
                      {memberNames.map((name, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1.5 bg-background border rounded-full text-sm"
                        >
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-foreground">{name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(name)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group, index) => {
              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  userBalance={group.userBalance || 0}
                  className={`animate-slide-up stagger-${(index % 5) + 1}`}
                />
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
      </div>
    </MainLayout>
  );
};

export default Groups;
