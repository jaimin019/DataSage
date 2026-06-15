import { createBrowserClient } from '@supabase/ssr'

// Browser client — for use in Client Components ('use client')
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton for direct use in non-component files (like api.ts)
export const supabase = createClient()
