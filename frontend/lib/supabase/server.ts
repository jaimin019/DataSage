import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server client — for use in Server Components, middleware, route handlers
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Middleware handles session refresh — this is a no-op in Server Components
          }
        },
      },
    }
  )
}
