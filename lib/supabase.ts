import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type SignedDocument = {
  id: string
  document_name: string
  document_id: string
  signer_name: string | null
  signer_email: string | null
  file_path: string | null
  file_url: string | null
  signed_at: string
  created_at: string
}
