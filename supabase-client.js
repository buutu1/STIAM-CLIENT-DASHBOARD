// ═══════════════════════════════════════════════════════════
// SUPABASE CLIENT — supabase-client.js
// Include this FIRST before any other JS on every page
// ═══════════════════════════════════════════════════════════

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://gccrloiulxkysdkoqwcq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjY3Jsb2l1bHhreXNka29xd2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjEyMzAsImV4cCI6MjA4NzY5NzIzMH0.gI_Kfs9-SaGGvIU_OiOGGOWt3DDJ9rvD1CSqZ_CPa9c'
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── Convenience: get current logged-in user ──────────────
export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

// ── Convenience: get investor profile from DB ────────────
export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    if (error) console.error('getProfile error:', error)
    return data
}

// ── Convenience: check if user is admin ─────────────────
export async function isAdmin(userId) {
    const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
    return data?.role === 'admin' || data?.role === 'manager'
}
