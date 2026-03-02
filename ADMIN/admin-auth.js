// ═══════════════════════════════════════════════════════════
// admin-auth.js — Admin Login Authentication
// Add this to admin.js or link as a separate file
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://gccrloiulxkysdkoqwcq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjY3Jsb2l1bHhreXNka29xd2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjEyMzAsImV4cCI6MjA4NzY5NzIzMH0.gI_Kfs9-SaGGvIU_OiOGGOWt3DDJ9rvD1CSqZ_CPa9c'

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON)

// ── If already logged in as admin, skip login page ───────
const { data: { session } } = await db.auth.getSession()
if (session) {
    const { data: profile } = await db
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (profile?.role === 'admin' || profile?.role === 'manager') {
        window.location.replace('admin-dashboard.html')
    }
}

// ── Admin login form ─────────────────────────────────────
const adminLoginForm = document.getElementById('admin-login-form')

if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async function (e) {
        e.preventDefault()

        const email = document.getElementById('admin-email').value.trim()
        const password = document.getElementById('admin-password').value
        const errEl = document.getElementById('admin-login-error')
        const btn = document.getElementById('admin-login-btn')

        errEl.textContent = ''

        if (!email) { errEl.textContent = 'Please enter your admin email.'; return }
        if (!password) { errEl.textContent = 'Please enter your password.'; return }

        btn.textContent = 'Verifying…'
        btn.disabled = true

        // Step 1 — Sign in with Supabase Auth
        const { data, error } = await db.auth.signInWithPassword({ email, password })

        if (error) {
            errEl.textContent = 'Invalid email or password. Please try again.'
            btn.textContent = 'Sign In'
            btn.disabled = false
            return
        }

        // Step 2 — Check role in profiles table
        const { data: profile } = await db
            .from('profiles')
            .select('role, first_name')
            .eq('id', data.user.id)
            .single()

        if (profile?.role === 'admin' || profile?.role === 'manager') {
            btn.textContent = 'Redirecting…'
            window.location.replace('admin-dashboard.html')
        } else {
            // Signed in but not an admin — sign them out and show error
            await db.auth.signOut()
            errEl.textContent = 'Access denied. This portal is for STI staff only.'
            btn.textContent = 'Sign In'
            btn.disabled = false
        }
    })
}
