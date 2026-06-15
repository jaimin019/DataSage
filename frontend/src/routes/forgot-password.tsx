import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Reset password · DataSage" }],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (!error) setSent(true);
    else setError(error.message);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="absolute inset-0 mesh-bg opacity-60 pointer-events-none" />
      <div className="relative w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight">DataSage</h1>
        </div>

        <div className="bg-card border rounded-2xl p-6 sm:p-8 shadow-xl">
          {sent ? (
            <div className="text-center space-y-5">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-semibold">Check your email</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  Reset link sent to <strong className="text-foreground">{email}</strong>.
                </p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/auth" })}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-display font-semibold">Reset password</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your email — we'll send a reset link.
                </p>
              </div>

              <form onSubmit={handleReset} className="space-y-4">
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

                {error && (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> {error}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending…" : "Send reset link"}
                </Button>
              </form>

              <p className="text-sm text-muted-foreground text-center mt-6">
                Remember your password?{" "}
                <Link to="/auth" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
