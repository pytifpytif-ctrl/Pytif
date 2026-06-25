import { supabase, isSupabaseConfigured } from './supabaseClient.js'

/** Subscribe to all user-owned rows; calls onChange on any insert/update/delete. */
export function subscribeUserData(userId, onChange) {
  if (!isSupabaseConfigured || !supabase || !userId) return () => {}

  let debounce
  const emit = () => {
    clearTimeout(debounce)
    debounce = setTimeout(onChange, 120)
  }

  const channel = supabase
    .channel(`pytif-live:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'schedules', filter: `user_id=eq.${userId}` },
      emit,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
      emit,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'deposits', filter: `user_id=eq.${userId}` },
      emit,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
      emit,
    )
    .subscribe()

  return () => {
    clearTimeout(debounce)
    supabase.removeChannel(channel)
  }
}
