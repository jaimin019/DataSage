import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · DataSage" },
      { name: "description", content: "Sign in to DataSage to save and revisit your analyses." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const navigate = useNavigate();

  const { user, signIn, signUp, signInWithGoogle, isLoading } = useAuthStore();

  useEffect(() => {
    if (user) navigate({ to: "/history" });
  }, [user, navigate]);

  const mapError = (msg: string): string => {
    const l = msg.toLowerCase();
    if (l.includes("invalid login")) return "Incorrect email or password.";
    if (l.includes("email not confirmed")) return "Please verify your email first.";
    if (l.includes("already registered")) return "An account with this email exists.";
    if (l.includes("too many")) return "Too many attempts. Wait a few minutes.";
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        if (password !== confirm) {
          setError("Passwords do not match.");
          return;
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }
        await signUp(email, password);
        setVerificationSent(true);
      }
    } catch (err) {
      setError(mapError(err instanceof Error ? err.message : "Authentication failed"));
    }
  };

  if (verificationSent) {
    return (
      <AuthShell>
        <div className="text-center space-y-5">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-display font-semibold">Check your email</h2>
            <p className="text-muted-foreground text-sm mt-2">
              We sent a confirmation link to{" "}
              <strong className="text-foreground">{email}</strong>.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => { setMode("signin"); setVerificationSent(false); }}>
            Back to sign in
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="mb-6">
        <h2 className="text-xl font-display font-semibold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "signin"
            ? "Sign in to access your analyses."
            : "Start running unlimited CSV analyses for free."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {mode === "signin" && (
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot?
              </Link>
            )}
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPass ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mode === "signup" && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type={showPass ? "text" : "password"}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={isLoading}
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        <Button type="submit" className="w-full transition-all duration-200 hover:scale-[1.01] hover:shadow-md hover:shadow-primary/25 active:scale-[0.99]" disabled={isLoading}>
          {isLoading ? "Loading…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 border-t" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Or continue with
        </span>
        <div className="flex-1 border-t" />
      </div>

      <Button
        variant="outline"
        className="w-full"
        type="button"
        disabled={isLoading}
        onClick={async () => {
          setError(null);
          try {
            await signInWithGoogle();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Google sign-in failed.");
          }
        }}
      >
        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </Button>

      <p className="text-sm text-muted-foreground text-center mt-6">
        {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="font-medium text-primary hover:underline"
        >
          {mode === "signin" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="absolute inset-0 mesh-bg opacity-60 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_30%,var(--color-background)_75%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative w-full max-w-md space-y-6"
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight">DataSage</h1>
        </div>

        <div className="bg-card border rounded-2xl p-6 sm:p-8 shadow-xl">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
