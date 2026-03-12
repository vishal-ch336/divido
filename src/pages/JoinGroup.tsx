import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { invitesApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import {
  Users,
  Loader2,
  LogIn,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react';

const PENDING_INVITE_KEY = 'divido_pending_invite';

interface InviteInfo {
  inviteCode: string;
  groupId: string;
  groupName: string;
  memberCount: number;
  currency: string;
  createdBy: { name: string; avatar?: string };
  expiresAt?: string;
  maxUses?: number;
  usesCount: number;
}

const JoinGroup = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  // ── Fetch invite info (public, no auth needed) ────────────────────────────
  useEffect(() => {
    if (!inviteCode) return;
    const fetchInvite = async () => {
      setFetchLoading(true);
      setFetchError(null);
      try {
        const data = await invitesApi.getInfo(inviteCode);
        setInviteInfo(data);
      } catch (error) {
        setFetchError(
          error instanceof ApiError
            ? error.message
            : 'This invite link is invalid or has expired.'
        );
      } finally {
        setFetchLoading(false);
      }
    };
    fetchInvite();
  }, [inviteCode]);

  // ── Auto-join after login redirect ────────────────────────────────────────
  // When the user comes back from /auth with a pending invite stored in sessionStorage,
  // we automatically call join() so they don't have to click the button again.
  useEffect(() => {
    if (authLoading || !user || !inviteCode) return;

    const pendingCode = sessionStorage.getItem(PENDING_INVITE_KEY);
    if (pendingCode === inviteCode) {
      sessionStorage.removeItem(PENDING_INVITE_KEY);
      handleJoin();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // ── Join handler ───────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!inviteCode) return;
    setJoining(true);
    try {
      const result = await invitesApi.join(inviteCode);
      setJoined(true);
      toast({
        title: 'Welcome!',
        description: `You've joined "${result.groupName}"`,
      });
      setTimeout(() => {
        navigate(`/groups/${result.groupId}`);
      }, 1500);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Already a member — just redirect to the group
        toast({
          title: 'Already a member',
          description: 'Redirecting you to the group…',
        });
        const data = (error as any).data;
        if (data?.groupId) {
          navigate(`/groups/${data.groupId}`);
          return;
        }
        // If we don't have the groupId in the error, still show a useful message
        toast({
          title: 'Already a member',
          description: "You're already in this group.",
        });
        navigate('/groups');
      } else {
        toast({
          title: 'Error joining group',
          description:
            error instanceof ApiError ? error.message : 'Something went wrong. Try again.',
          variant: 'destructive',
        });
      }
      setJoining(false);
    }
  };

  // ── Redirect unauthenticated users to /auth ───────────────────────────────
  const handleSignInToJoin = () => {
    if (inviteCode) {
      sessionStorage.setItem(PENDING_INVITE_KEY, inviteCode);
    }
    navigate('/auth');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render states
  // ─────────────────────────────────────────────────────────────────────────

  // Full-screen centred layout (no sidebar, accessible to guests)
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );

  if (fetchLoading || authLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading invite…</p>
        </div>
      </Shell>
    );
  }

  if (fetchError) {
    return (
      <Shell>
        <div className="bg-card rounded-2xl border border-border p-8 shadow-card text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 mx-auto">
            <XCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Invalid Invite Link</h1>
          <p className="text-muted-foreground text-sm">{fetchError}</p>
          <Link to={user ? '/groups' : '/auth'}>
            <Button variant="outline" className="mt-2">
              {user ? 'Go to Groups' : 'Sign In'}
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  if (joined) {
    return (
      <Shell>
        <div className="bg-card rounded-2xl border border-border p-8 shadow-card text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-credit/10 mx-auto">
            <CheckCircle2 className="h-7 w-7 text-credit" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">You're in!</h1>
          <p className="text-muted-foreground text-sm">Redirecting you to the group…</p>
          <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />
        </div>
      </Shell>
    );
  }

  if (!inviteInfo) return null;

  return (
    <Shell>
      <div className="bg-card rounded-2xl border border-border p-8 shadow-card space-y-6">
        {/* Group preview */}
        <div className="text-center space-y-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-1">
              You've been invited to join
            </p>
            <h1 className="text-2xl font-bold text-foreground">{inviteInfo.groupName}</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{inviteInfo.memberCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Members</p>
          </div>
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <p className="text-sm font-semibold text-foreground truncate">
              {inviteInfo.createdBy.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Invited by</p>
          </div>
        </div>

        {/* Expiry notice */}
        {inviteInfo.expiresAt && (
          <p className="text-xs text-center text-muted-foreground">
            Expires {new Date(inviteInfo.expiresAt).toLocaleDateString()}
          </p>
        )}

        {/* CTA */}
        {user ? (
          <Button
            onClick={handleJoin}
            disabled={joining}
            className="w-full gap-2"
            size="lg"
          >
            {joining ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Joining…
              </>
            ) : (
              <>
                Join Group
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3">
            <Button onClick={handleSignInToJoin} className="w-full gap-2" size="lg">
              <LogIn className="h-4 w-4" />
              Sign in to Join
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You'll be automatically added to the group after signing in.
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
};

export default JoinGroup;
