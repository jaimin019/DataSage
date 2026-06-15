'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { signIn, signInWithGoogle, isLoading } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/history'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await signIn(email, password)
      router.push(redirectTo)
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Sign in failed'
      setError(mapAuthError(msg))
    }
  }

  function mapAuthError(msg: string): string {
    if (msg.toLowerCase().includes('invalid login credentials'))
      return 'Incorrect email or password. Please try again.'
    if (msg.toLowerCase().includes('email not confirmed'))
      return 'Please verify your email address before signing in.'
    if (msg.toLowerCase().includes('too many requests'))
      return 'Too many attempts. Please wait a few minutes.'
    return msg
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
          <p className="text-muted-foreground">Autonomous Data Analysis</p>
        </div>

        {/* Card */}
        <div className="bg-card border shadow-sm rounded-xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">Sign in to your account</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link 
                  href="/forgot-password" 
                  className="text-sm font-medium text-primary hover:underline"
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPass ? 'text' : 'password'} 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 flex items-center">
            <div className="flex-grow border-t" />
            <span className="px-3 text-xs text-muted-foreground uppercase bg-card">Or</span>
            <div className="flex-grow border-t" />
          </div>

          <div className="mt-6">
            <Button 
              variant="outline" 
              className="w-full relative bg-white text-black hover:bg-gray-50 border-gray-200"
              onClick={async () => {
                setError(null)
                try {
                  await signInWithGoogle()
                } catch (err: any) {
                  setError(err instanceof Error ? err.message : 'Google sign-in failed.')
                }
              }}
              type="button"
              disabled={isLoading}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up &rarr;
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
