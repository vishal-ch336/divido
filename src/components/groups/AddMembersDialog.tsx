import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { groupsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { Plus, X, User, Loader2, UserPlus } from 'lucide-react';

interface AddMembersDialogProps {
    groupId: string;
    groupName?: string;
    onMembersAdded?: () => void;
    trigger?: React.ReactNode;
}

export const AddMembersDialog = ({ groupId, groupName, onMembersAdded, trigger }: AddMembersDialogProps) => {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [memberEmail, setMemberEmail] = useState('');
    const [memberEmails, setMemberEmails] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (memberEmails.length === 0) {
            toast({
                title: 'Validation Error',
                description: 'Please add at least one email address',
                variant: 'destructive',
            });
            return;
        }

        // Validate all emails
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
            await groupsApi.addMembers(groupId, memberEmails);

            const memberCount = memberEmails.length;
            toast({
                title: 'Success!',
                description: `Successfully added ${memberCount} member${memberCount === 1 ? '' : 's'}${groupName ? ` to ${groupName}` : ''}`,
            });

            // Reset form
            setMemberEmail('');
            setMemberEmails([]);
            setIsOpen(false);

            // Notify parent to refresh data
            if (onMembersAdded) {
                onMembersAdded();
            }
        } catch (error) {
            console.error('Error adding members:', error);
            toast({
                title: 'Error',
                description: error instanceof ApiError ? error.message : 'Failed to add members. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!loading) {
            setIsOpen(open);
            if (!open) {
                // Reset form when closing
                setMemberEmail('');
                setMemberEmails([]);
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Add Members
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Members{groupName ? ` to ${groupName}` : ''}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="memberEmail">Add Members</Label>
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
                            disabled={loading || memberEmails.length === 0}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                'Add Members'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
