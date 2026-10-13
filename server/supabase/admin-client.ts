import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { supabaseUrl } from "@/lib/supabase/env"
import { serverEnv } from "../env"

let client: SupabaseClient | undefined

export function getAdminClient(): SupabaseClient {
  client ??= createClient(supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}
