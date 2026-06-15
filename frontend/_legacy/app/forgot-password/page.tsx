'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  
  const router = useRouter()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    
    setIsLoading(false)
    if (!error) setEmailSent(true)
    else setError(error.message)
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md bg-card border shadow-sm rounded-xl p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-4 rounded-full">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold">Check your email</h2>
          <p className="text-muted-foreground text-sm">
            Password reset link sent to <strong className="text-foreground">{email}</strong>.
          </p>
          <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/login')}>
            Back to Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">
              DataSage
            </h1>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border shadow-sm rounded-xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Reset your password</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
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
              <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in &rarr;
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
