import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Users, TrendingUp, Shield, Loader2, Mail, ArrowLeft, RefreshCw } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const OTP_RESEND_SECONDS = 30;

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signUp, verifyEmail, resendOtp, googleSignIn } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const googleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setIsGoogleLoading(true);
      // Exchange the access token for user info, then send credential to backend
      // For implicit flow we need to use the access_token approach
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();
        // Build a pseudo-credential object and sign in via our backend endpoint
        // We'll pass the access_token and let backend validate via userinfo
        const { error } = await googleSignIn(tokenResponse.access_token);
        if (error) {
          toast({ title: 'Google Sign-In Failed', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: 'Welcome!', description: `Signed in as ${userInfo.name}` });
        }
      } catch {
        toast({ title: 'Google Sign-In Failed', description: 'Could not complete Google sign-in', variant: 'destructive' });
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: () => {
      toast({ title: 'Google Sign-In Failed', description: 'Google login was cancelled or failed.', variant: 'destructive' });
    },
  });

  // OTP verification state
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [verifyEmail_, setVerifyEmail_] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      // If the user came from an invite link, send them back there to auto-join
      const pendingInvite = sessionStorage.getItem('divido_pending_invite');
      if (pendingInvite) {
        navigate(`/join/${pendingInvite}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);


  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  const startOtpFlow = (email: string) => {
    setVerifyEmail_(email);
    setOtpDigits(['', '', '', '', '', '']);
    setResendTimer(OTP_RESEND_SECONDS);
    setShowOtpScreen(true);
    // Focus first input after render
    setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (index: number, value: string) => {
    // Accept only single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    // Auto-advance focus
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) return;
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const digits = pasted.split('');
    const updated = ['', '', '', '', '', ''];
    digits.forEach((d, i) => { if (i < 6) updated[i] = d; });
    setOtpDigits(updated);
    // Focus the last filled input or the next empty
    const nextIndex = Math.min(digits.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      toast({ title: 'Enter all 6 digits', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const { error } = await verifyEmail(verifyEmail_, otp);
    setIsLoading(false);

    if (error) {
      toast({ title: 'Verification Failed', description: error.message, variant: 'destructive' });
      // Clear digits on fail
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } else {
      toast({ title: '✅ Email Verified!', description: 'Welcome to Divido!' });
      // user is now set in context, navigation handled by useEffect
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    const { error } = await resendOtp(verifyEmail_);
    setIsLoading(false);
    if (error) {
      toast({ title: 'Failed to Resend', description: error.message, variant: 'destructive' });
    } else {
      setResendTimer(OTP_RESEND_SECONDS);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
      toast({ title: 'OTP Resent', description: `A new code was sent to ${verifyEmail_}` });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast({ title: 'Validation Error', description: validation.error.errors[0].message, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const result = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (result.error) {
      if (result.needsVerification) {
        // User signed up but never verified — take them to OTP screen
        toast({ title: 'Email not verified', description: 'Enter the OTP we sent to your email.' });
        startOtpFlow(loginEmail);
      } else {
        toast({
          title: 'Login Failed',
          description: result.error.message === 'Invalid login credentials'
            ? 'Invalid email or password. Please try again.'
            : result.error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = signupSchema.safeParse({
      fullName: signupName,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
    });

    if (!validation.success) {
      toast({ title: 'Validation Error', description: validation.error.errors[0].message, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const result = await signUp(signupEmail, signupPassword, signupName);
    setIsLoading(false);

    if (result.error) {
      if (result.error.message.includes('already exists') || result.error.message.includes('already registered')) {
        toast({ title: 'Account Exists', description: 'An account with this email already exists. Please log in.', variant: 'destructive' });
        setActiveTab('login');
        setLoginEmail(signupEmail);
      } else {
        toast({ title: 'Signup Failed', description: result.error.message, variant: 'destructive' });
      }
    } else {
      // Signup was successful — show OTP screen
      toast({ title: 'Check your email!', description: `We sent a verification code to ${signupEmail}` });
      startOtpFlow(signupEmail);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">Divido</span>
          </div>
          <p className="text-muted-foreground">Shared Expense Management</p>
        </div>

        <div className="space-y-8">
          <h1 className="text-4xl font-bold text-foreground leading-tight">
            Manage shared expenses <br />
            <span className="text-primary">with complete transparency</span>
          </h1>

          <div className="grid gap-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Group Management</h3>
                <p className="text-sm text-muted-foreground">Create groups for trips, roommates, or events</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Smart Splitting</h3>
                <p className="text-sm text-muted-foreground">Equal, percentage, or share-based expense splitting</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-credit/10 flex items-center justify-center shrink-0">
                <Shield className="h-6 w-6 text-credit" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Transparent Tracking</h3>
                <p className="text-sm text-muted-foreground">Complete activity timeline with dispute flagging</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Trusted by thousands of users across India
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        {showOtpScreen ? (
          /* ── OTP Verification Panel ── */
          <Card className="w-full max-w-md border-border/50 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">Divido</span>
              </div>
              <div className="flex justify-center mb-3">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-7 w-7 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Verify your email</CardTitle>
              <CardDescription>
                We sent a 6-digit code to <span className="font-medium text-foreground">{verifyEmail_}</span>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* 6 digit OTP inputs */}
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpInputRefs.current[i] = el; }}
                      id={`otp-digit-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-11 h-13 text-center text-xl font-bold rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      style={{ height: '3.25rem' }}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || otpDigits.join('').length < 6}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify Email'
                  )}
                </Button>

                {/* Resend + Back */}
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => setShowOtpScreen(false)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || isLoading}
                    className="flex items-center gap-1 text-muted-foreground hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* ── Login / Signup Panel ── */
          <Card className="w-full max-w-md border-border/50 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">Divido</span>
              </div>
              <CardTitle className="text-2xl">Welcome</CardTitle>
              <CardDescription>Sign in to manage your shared expenses</CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </form>

                  {/* Google divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => googleLogin()}
                    disabled={isGoogleLoading || isLoading}
                    id="google-login-btn"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirm Password</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </form>

                  {/* Google divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => googleLogin()}
                    disabled={isGoogleLoading || isLoading}
                    id="google-signup-btn"
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    Continue with Google
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Auth;
