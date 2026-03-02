// ═══════════════════════════════════════════════════════════
// dashboard-data.js — Loads real investor data from Supabase
// ═══════════════════════════════════════════════════════════

// ── Helpers ──────────────────────────────────────────────
const naira = n => '₦' + Number(n).toLocaleString('en-NG', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
})
const fmtDate = (s, opts) => new Date(s).toLocaleDateString('en-GB',
    opts || { day: 'numeric', month: 'long', year: 'numeric' })
const fmtShort = s => new Date(s).toLocaleDateString('en-GB', {
    month: 'short', year: 'numeric'
})
function set(id, val) {
    const el = document.getElementById(id)
    if (el) el.textContent = val
}
function calcProgress(start, end) {
    const now = new Date(), s = new Date(start), e = new Date(end)
    return Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)))
}
function calcAccrued(principal, rate, start) {
    const years = (new Date() - new Date(start)) / (1000 * 60 * 60 * 24 * 365)
    return principal * (rate / 100) * years
}
function calcMonths(start, tenureMonths) {
    const now = new Date(), s = new Date(start)
    const elapsed = Math.min(tenureMonths, Math.max(0,
        (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth())))
    return { elapsed, remaining: tenureMonths - elapsed }
}

// ── Main ─────────────────────────────────────────────────
async function loadDashboard() {
    const db = window._db
    if (!db) { console.error('❌ db is undefined'); return }
    const { data: { session } } = await db.auth.getSession()
    if (!session) { window.location.replace('index.html'); return }

    const uid = session.user.id

    // Profile
    const { data: profile } = await db
        .from('profiles')
        .select('first_name, last_name, investor_id, avatar_initials')
        .eq('id', uid)
        .single()

    if (!profile) return

    const fullName = profile.first_name + ' ' + profile.last_name
    const initials = profile.avatar_initials ||
        fullName.split(' ').map(w => w[0]).join('').toUpperCase()

    set('sidebar-avatar', initials)
    set('sidebar-investor-name', fullName)
    set('sidebar-investor-id', 'ID: ' + profile.investor_id)
    set('investor-name-display', profile.first_name)
    set('statement-date', fmtDate(new Date()))

    // Most recent active investment
    const { data: invs } = await db
        .from('investments')
        .select('*')
        .eq('investor_id', uid)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)

    if (!invs || invs.length === 0) return
    const inv = invs[0]

    const accrued = calcAccrued(inv.principal, inv.interest_rate, inv.start_date)
    const curVal = inv.principal + accrued
    const projected = inv.principal * (1 + inv.interest_rate / 100)
    const progress = calcProgress(inv.start_date, inv.maturity_date)
    const { elapsed, remaining } = calcMonths(inv.start_date, inv.tenure_months)

    // Stat cards
    set('stat-investment', naira(inv.principal))
    set('stat-portfolio', naira(curVal))
    set('stat-accrued', naira(accrued))

    // Investment details table
    set('detail-amount', naira(inv.principal))
    set('detail-tenure', inv.tenure_months + ' Months')
    set('detail-start', fmtDate(inv.start_date))
    set('detail-maturity', fmtDate(inv.maturity_date))

    // Progress bar
    set('progress-pct-hero', progress + '%')
    set('progress-pct-label', progress + '% complete')
    set('progress-start-date', fmtShort(inv.start_date))
    set('progress-end-date', fmtShort(inv.maturity_date))
    setTimeout(() => {
        const fill = document.getElementById('progress-fill')
        if (fill) fill.style.width = progress + '%'
    }, 300)

    // Performance summary
    set('perf-rate', inv.interest_rate + '%')
    set('perf-accrued', naira(accrued))
    set('perf-value', naira(curVal))
    set('perf-elapsed', elapsed + ' Month' + (elapsed !== 1 ? 's' : ''))
    set('perf-remaining', remaining + ' Month' + (remaining !== 1 ? 's' : ''))
    set('perf-projected', naira(projected))
    set('perf-progress-pct', progress + '%')

    const miniDesc = document.querySelector('.mini-desc')
    if (miniDesc) {
        miniDesc.textContent = progress >= 100
            ? 'Your investment has matured!'
            : progress + '% through your ' + inv.tenure_months + '-month term'
    }
}

loadDashboard()
// ── Notifications ─────────────────────────────────────────
async function loadNotifications() {
    const db = window._db
    const { data: { session } } = await db.auth.getSession()
    if (!session) return

    const { data: notifs } = await db
        .from('notifications')
        .select('*')
        .eq('investor_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20)

    if (!notifs || notifs.length === 0) return

    const iconMap = {
        interest: { bubble: 'interest', icon: '💰' },
        maturity: { bubble: 'maturity', icon: '📅' },
        alert: { bubble: 'alert', icon: '⏳' },
        payment: { bubble: 'interest', icon: '💳' },
        statement: { bubble: 'system', icon: '📄' },
        system: { bubble: 'system', icon: '🔐' },
    }

    function timeAgo(dateStr) {
        const now = new Date(), d = new Date(dateStr)
        const diff = Math.floor((now - d) / 1000)
        if (diff < 60) return 'Just now'
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
        if (diff < 86400) return 'Today, ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        if (diff < 172800) return 'Yesterday, ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const list = document.getElementById('notif-popup-list')
    if (!list) return

    const unreadIds = notifs.filter(n => !n.read_at).map(n => n.id)

    list.innerHTML = notifs.map(n => {
        const map = iconMap[n.type] || iconMap.system
        const isUnread = !n.read_at
        return `
        <div class="notif-popup-item ${isUnread ? 'unread' : ''}" data-id="${n.id}">
            <div class="notif-popup-bubble ${map.bubble}">${map.icon}</div>
            <div class="notif-popup-body">
                <div class="notif-popup-item-title">${n.title}</div>
                <div class="notif-popup-item-desc">${n.message}</div>
                <div class="notif-popup-item-time">${timeAgo(n.created_at)}</div>
            </div>
            ${isUnread ? '<div class="notif-popup-dot"></div>' : ''}
        </div>`
    }).join('')

    // Update bell dot and unread count
    const unreadCount = notifs.filter(n => !n.read_at).length
    const bellDot = document.getElementById('notif-bell-dot')
    const unreadLbl = document.getElementById('notif-unread-label')
    if (bellDot) bellDot.classList.toggle('visible', unreadCount > 0)
    if (unreadLbl) unreadLbl.textContent = unreadCount > 0
        ? unreadCount + ' unread notification' + (unreadCount !== 1 ? 's' : '')
        : 'All caught up!'

    // Mark as read when clicked
    list.querySelectorAll('.notif-popup-item').forEach(item => {
        item.addEventListener('click', async () => {
            if (!item.classList.contains('unread')) return
            const id = item.dataset.id
            await db.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
            item.classList.remove('unread')
            const dot = item.querySelector('.notif-popup-dot')
            if (dot) dot.remove()
            const remaining = list.querySelectorAll('.notif-popup-item.unread').length
            if (bellDot) bellDot.classList.toggle('visible', remaining > 0)
            if (unreadLbl) unreadLbl.textContent = remaining > 0
                ? remaining + ' unread notification' + (remaining !== 1 ? 's' : '')
                : 'All caught up!'
        })
    })

    // Mark all read
    const markAllBtn = document.getElementById('notif-mark-all')
    if (markAllBtn) {
        markAllBtn.addEventListener('click', async () => {
            if (unreadIds.length === 0) return
            await db.from('notifications')
                .update({ read_at: new Date().toISOString() })
                .in('id', unreadIds)
            list.querySelectorAll('.notif-popup-item.unread').forEach(item => {
                item.classList.remove('unread')
                const dot = item.querySelector('.notif-popup-dot')
                if (dot) dot.remove()
            })
            if (bellDot) bellDot.classList.remove('visible')
            if (unreadLbl) unreadLbl.textContent = 'All caught up!'
        })
    }
}

loadNotifications()