/**
 * Supabase server-side client with service role key.
 * Used in API routes for privileged operations.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing server-side Supabase environment variables')
}

/**
 * Create a Supabase client with service role key.
 * This bypasses RLS and is for server-side use only.
 */
export function getServiceClient() {
  return createClient(supabaseUrl || '', supabaseServiceKey || '')
}

/**
 * Verify the JWT from the Authorization header and return the user ID.
 *
 * @param {Request} req - The incoming request
 * @returns {string|null} User ID or null if unauthorized
 */
export async function getUserId(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]
  const supabase = getServiceClient()

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return null
  }

  return user.id
}
