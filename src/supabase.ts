import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !publishableKey) throw new Error('Supabase public client settings are missing.')

export const supabase = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
