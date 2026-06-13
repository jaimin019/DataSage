import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthStore {
  user:       User | null
  isLoading:  boolean
  isInitialized: boolean  // true after first session check

  initialize:       () => Promise<void>
  signIn:           (email: string, password: string) => Promise<void>
  signUp:           (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut:          () => Promise<void>
  setUser:          (user: User | null) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:          null,
  isLoading:     false,
  isInitialized: false,

  initialize: async () => {
    // Call once in layout.tsx to hydrate auth state
    const { data: { user } } = await supabase.auth.getUser()
    set({ user, isInitialized: true })

    // Listen for auth state changes (token refresh, sign out from another tab)
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null })
    })
  },

  signIn: async (email, password) => {
    set({ isLoading: true })
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const { data: { user } } = await supabase.auth.getUser()
      set({ user })
    } finally {
      set({ isLoading: false })
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true })
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      // Note: user needs to verify email — don't set user yet
    } finally {
      set({ isLoading: false })
    }
  },

  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: true,
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) throw error

    if (data?.url) {
      try {
        // Pre-flight check: If provider is not enabled, Supabase returns a 400 JSON response with CORS headers.
        // If it is enabled, it redirects to Google, which fails here due to CORS (TypeError: Failed to fetch), 
        // which means we are good to go!
        const res = await fetch(data.url)
        
        if (!res.ok) {
          try {
            const json = await res.json()
            if (json.msg?.includes("not enabled")) {
              throw new Error("Google sign-in is not enabled in your Supabase project. Please enable it under Authentication > Providers.")
            }
          } catch (parseErr) {
            // ignore JSON parse errors
          }
        }
        
        // If we reach here, no explicit 'not enabled' error was found
        window.location.href = data.url
      } catch (err: any) {
        if (err.message && err.message.includes("Google sign-in is not enabled")) {
          throw err
        }
        
        // A CORS error or Type error means the redirect to Google's OAuth page was successfully initiated by the server!
        // So we can safely redirect the browser.
        window.location.href = data.url
      }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },

  setUser: (user) => set({ user }),
}))
