"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Heart, Check, X, ArrowLeft, ArrowRight, Mail, Shield, AlertCircle, Lock, User, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { signInSchema, signUpSchema, getPasswordStrength } from '@/lib/validation';
import { motion, AnimatePresence } from 'framer-motion';

type AuthMode = 'signin' | 'signup' | 'forgot-password' | 'reset-password' | 'verify-email' | 'logout-confirm' | 'logged-out';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, signIn, signUp, signOut } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Handle mode from URL
  useEffect(() => {
    const urlMode = searchParams.get('mode') as AuthMode;
    if (urlMode) setMode(urlMode);
    
    const type = searchParams.get('type');
    const accessToken = searchParams.get('access_token');
    if (type === 'recovery' && accessToken) {
      setMode('reset-password');
    }
  }, [searchParams]);

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
        setLoading(false);
      } else {
        toast.success('Welcome back!');
        router.push('/dashboard');
      }
    } catch (error) {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error.message);
      } else {
        setMode('verify-email');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email is required');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
      });
      if (error) throw error;
      toast.success('Reset link sent to your email');
      setMode('signin');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated successfully');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      setMode('logged-out');
    } catch (error) {
      toast.error('Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setErrors({});
    setTouched({});
  };

  const getVisualContent = () => {
    switch(mode) {
      case 'verify-email':
        return {
          title: "Verify your email identity.",
          desc: "We've sent a secure confirmation link to your inbox. Verification ensures the privacy and integrity of your medical records.",
          icon: Mail
        };
      case 'logout-confirm':
        return {
          title: "Leaving so soon?",
          desc: "Your session will be closed and your health data will remain encrypted on our secure servers until your return.",
          icon: Shield
        };
      case 'logged-out':
        return {
          title: "Session terminated securely.",
          desc: "You have been logged out of CareForAb. Your health insights are safe and ready for your next visit.",
          icon: CheckCircle2
        };
      case 'forgot-password':
      case 'reset-password':
        return {
          title: "Reclaiming your secure access.",
          desc: "We prioritize your security. Follow the steps to regain access to your personal health dashboard with precision.",
          icon: Lock
        };
      default:
        return {
          title: mode === 'signup' ? "Join the future of empathetic care." : "Empowering your health journey with precision.",
          desc: mode === 'signup' ? "Experience a professional health platform designed for human connection." : "Experience a new standard of holistic care that balances data with empathy.",
          icon: Heart
        };
    }
  };

  const visual = getVisualContent();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col lg:grid lg:grid-cols-2 min-h-[700px]"
      >
        {/* Left Side - Visual Panel */}
        <div className="relative bg-primary p-12 text-primary-foreground hidden lg:flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse-gentle" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full -ml-48 -mb-48 blur-3xl" />
          
          <div className="relative z-10 flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">CareForAb</span>
          </div>

          <div className="relative z-10 space-y-8 max-w-md">
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
                {visual.title}
              </h2>
              <p className="text-primary-foreground/70 text-lg leading-relaxed mt-6">
                {visual.desc}
              </p>
            </motion.div>
            
            <div className="space-y-4 pt-4">
              {[
                { icon: Shield, title: 'Medical Grade Security', desc: 'Industry leading encryption for your health records.' },
                { icon: visual.icon, title: 'Precision Powered', desc: 'Real-time monitoring backed by empathetic design.' }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{item.title}</h4>
                    <p className="text-xs text-primary-foreground/60 leading-relaxed mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 text-[10px] font-medium opacity-40">
            © 2026 K.A.Y.E. All rights reserved.
          </div>
        </div>

        {/* Right Side - Form Panel */}
        <div className="p-8 md:p-16 flex flex-col justify-center relative bg-white">
          <div className="max-w-md w-full mx-auto space-y-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {mode === 'signin' && (
                  <form onSubmit={handleSignIn} className="space-y-6">
                    <div className="space-y-2">
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
                      <p className="text-muted-foreground">Sign in to your health dashboard.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-black uppercase text-slate-400">Email</Label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-slate-50 border-slate-100 rounded-xl" placeholder="name@example.com" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <Label className="text-xs font-black uppercase text-slate-400">Password</Label>
                          <button type="button" onClick={() => setMode('forgot-password')} className="text-[10px] font-bold text-primary uppercase">Forgot Password?</button>
                        </div>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-slate-50 border-slate-100 rounded-xl" placeholder="••••••••" />
                      </div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                      {loading ? 'Processing...' : 'Sign In'} <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                    <p className="text-center text-xs font-medium text-slate-500">
                      Don't have an account? <button type="button" onClick={() => setMode('signup')} className="text-primary font-bold hover:underline">Get Started</button>
                    </p>
                  </form>
                )}

                {mode === 'signup' && (
                  <form onSubmit={handleSignUp} className="space-y-6">
                    <div className="space-y-2">
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create Account</h1>
                      <p className="text-muted-foreground">Start your health journey today.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-black uppercase text-slate-400">Full Name</Label>
                        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-12 bg-slate-50 border-slate-100 rounded-xl" placeholder="Full name" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-black uppercase text-slate-400">Email</Label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-slate-50 border-slate-100 rounded-xl" placeholder="name@example.com" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-black uppercase text-slate-400">Password</Label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-slate-50 border-slate-100 rounded-xl" placeholder="••••••••" />
                      </div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                      {loading ? 'Processing...' : 'Sign Up'}
                    </Button>
                    <p className="text-center text-xs font-medium text-slate-500">
                      Already have an account? <button type="button" onClick={() => setMode('signin')} className="text-primary font-bold hover:underline">Sign In</button>
                    </p>
                  </form>
                )}

                {mode === 'verify-email' && (
                  <div className="space-y-8 text-center sm:text-left">
                    <div className="space-y-2">
                      <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mx-auto sm:mx-0">
                        <Mail className="w-8 h-8" />
                      </div>
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-6">Confirm your email.</h1>
                      <p className="text-muted-foreground leading-relaxed">
                        To protect your account security, we've sent a verification link to your email address. 
                        Please click the link to finalize your registration.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <Button onClick={() => setMode('signin')} variant="outline" className="w-full h-12 rounded-xl font-bold">
                        Back to Sign In
                      </Button>
                      <p className="text-xs text-slate-400 text-center">
                        Didn't receive the email? Check your spam folder or contact support.
                      </p>
                    </div>
                  </div>
                )}

                {mode === 'forgot-password' && (
                  <form onSubmit={handleForgotPassword} className="space-y-8">
                    <div className="space-y-2">
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Forgot password?</h1>
                      <p className="text-muted-foreground">No worries, we'll send you reset instructions.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-black uppercase text-slate-400">Email Address</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-slate-50 border-slate-100 rounded-xl" placeholder="name@example.com" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </Button>
                    <button type="button" onClick={() => setMode('signin')} className="w-full text-center text-xs font-bold text-primary flex items-center justify-center gap-2">
                       <ArrowLeft size={12} /> Back to Sign In
                    </button>
                  </form>
                )}

                {mode === 'logout-confirm' && (
                  <div className="space-y-8 text-center sm:text-left">
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center text-red-500 mx-auto sm:mx-0">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sign out?</h1>
                      <p className="text-muted-foreground leading-relaxed">
                        Are you sure you want to end your secure session? You'll need to sign back in to access your data.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <Button onClick={handleSignOut} disabled={loading} className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 font-bold shadow-lg shadow-red-100">
                        {loading ? 'Signing out...' : 'Sign Out'}
                      </Button>
                      <Button onClick={() => router.back()} variant="ghost" className="w-full h-12 rounded-xl font-bold text-slate-500">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {mode === 'logged-out' && (
                  <div className="space-y-8 text-center sm:text-left">
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-400 mx-auto sm:mx-0">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Signed out safely.</h1>
                      <p className="text-muted-foreground leading-relaxed">
                        Your session has been terminated. Your medical data is securely stored and ready for your return.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <Button onClick={() => setMode('signin')} className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20">
                        Sign In Again
                      </Button>
                      <Link href="/" className="block w-full text-center text-xs font-bold text-slate-400 hover:text-primary transition-colors">
                        Return to Home
                      </Link>
                    </div>
                  </div>
                )}

                {mode === 'reset-password' && (
                  <form onSubmit={handleResetPassword} className="space-y-8">
                    <div className="space-y-2">
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900">New Password</h1>
                      <p className="text-muted-foreground">Create a secure password for your account.</p>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-black uppercase text-slate-400">New Password</Label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-slate-50 border-slate-100 rounded-xl" placeholder="••••••••" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-black uppercase text-slate-400">Confirm Password</Label>
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 bg-slate-50 border-slate-100 rounded-xl" placeholder="••••••••" />
                      </div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                      {loading ? 'Processing...' : 'Update Password'}
                    </Button>
                  </form>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-primary">CareForAb...</div>}>
      <AuthContent />
    </Suspense>
  );
}
