import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://cxnbdkkjipniihkxggfk.supabase.co', 'sb_publishable_ZKDVelCazbnx9yRHtrGedA_fxbSo5R1')

async function test() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      skipBrowserRedirect: true
    }
  })
  console.log("Data:", data)
  console.log("Error:", error)
}
test()
