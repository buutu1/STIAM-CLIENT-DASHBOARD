// ═══════════════════════════════════════════════════════════
// client-login.js — Investor Login
// ═══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://gccrloiulxkysdkoqwcq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjY3Jsb2l1bHhreXNka29xd2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjEyMzAsImV4cCI6MjA4NzY5NzIzMH0.gI_Kfs9-SaGGvIU_OiOGGOWt3DDJ9rvD1CSqZ_CPa9c'

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON)

// ── If already logged in, skip login page ────────────────
db.auth.getSession().then(({ data: { session } }) => {
    if (session) window.location.replace('dashboard.html')
})

// ── Login form ───────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault()

    const email = document.getElementById('email').value.trim()
    const password = document.getElementById('password').value
    const errEl = document.getElementById('login-error')
    const btn = document.getElementById('login-btn')

    errEl.textContent = ''

    if (!email && !password) {
        errEl.textContent = 'Please enter your email and password.'
        return
    }
    if (!email) {
        errEl.textContent = 'Please enter your email address.'
        return
    }
    if (!password) {
        errEl.textContent = 'Please enter your password.'
        return
    }

    btn.textContent = 'Verifying…'
    btn.disabled = true

    const { data, error } = await db.auth.signInWithPassword({ email, password })

    if (error) {
        errEl.textContent = 'Invalid email or password. Please try again.'
        btn.textContent = 'Sign In'
        btn.disabled = false
        return
    }

    // Check role — if admin redirect to admin portal
    const { data: profile } = await db
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

    btn.textContent = 'Redirecting…'

    if (profile?.role === 'admin' || profile?.role === 'manager') {
        window.location.replace('admin-dashboard.html')
    } else {
        window.location.replace('dashboard.html')
    }
})