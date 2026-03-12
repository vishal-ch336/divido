import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { invitesApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { Link2, Copy, Share2, Loader2, CheckCheck, RefreshCw } from 'lucide-react';

interface InviteDialogProps {
  groupId: string;
  groupName?: string;
  trigger?: React.ReactNode;
}

export const InviteDialog = ({ groupId, groupName, trigger }: InviteDialogProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await invitesApi.generate(groupId);
      setInviteUrl(data.inviteUrl);
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof ApiError ? error.message : 'Failed to generate invite link',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Invite link copied to clipboard' });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        title: 'Error',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.share({
        title: `Join ${groupName || 'our group'} on Divido`,
        text: `Use this link to join the group on Divido: ${inviteUrl}`,
        url: inviteUrl,
      });
    } catch {
      // User cancelled share or browser doesn't support it
    }
  };

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleOpenChange = (open: boolean) => {
    if (!loading) {
      setIsOpen(open);
      if (!open) {
        setInviteUrl(null);
        setCopied(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Link2 className="h-4 w-4" />
            Invite via Link
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Invite Members{groupName ? ` to ${groupName}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {!inviteUrl ? (
            <div className="text-center space-y-4 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">Generate an invite link</p>
                <p className="text-sm text-muted-foreground">
                  Anyone with this link can join the group instantly.
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Generate Invite Link
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Invite URL display */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Your invite link</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={inviteUrl}
                    className="flex-1 text-xs font-mono bg-muted/50 text-muted-foreground cursor-default select-all"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleCopy}
                  variant={copied ? 'default' : 'outline'}
                  className="flex-1 gap-2 transition-all"
                >
                  {copied ? (
                    <>
                      <CheckCheck className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>

                {canShare && (
                  <Button onClick={handleShare} variant="outline" className="flex-1 gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                )}
              </div>

              {/* Regenerate */}
              <Button
                onClick={handleGenerate}
                variant="ghost"
                disabled={loading}
                className="w-full text-muted-foreground gap-2 text-sm"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Generate a new link
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                This link won't expire unless you generate a new one.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
