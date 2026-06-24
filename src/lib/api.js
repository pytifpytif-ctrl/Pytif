// Backend-agnostic data API. Picks the Supabase backend when configured,
// otherwise falls back to the in-browser mock so the app always runs.

import { isSupabaseConfigured } from './supabaseClient.js'
import { mockBackend } from './mockBackend.js'
import { supabaseBackend } from './supabaseBackend.js'

export const api = isSupabaseConfigured ? supabaseBackend : mockBackend

export const usingMockBackend = !isSupabaseConfigured
