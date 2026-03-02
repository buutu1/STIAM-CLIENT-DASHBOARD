// ═══════════════════════════════════════════════════════════
// investments-data.js — Loads investments from Supabase
// ═══════════════════════════════════════════════════════════


// ── Helpers ──────────────────────────────────────────────
const naira = n => '₦' + Number(n).toLocaleString('en-NG', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
})
const fmtDate = s => new Date(s).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
})
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

// ── Build card HTML ──────────────────────────────────────
function buildCard(inv, delay) {
    const accrued = calcAccrued(inv.principal, inv.interest_rate, inv.start_date)
    const curVal = inv.principal + accrued
    const progress = calcProgress(inv.start_date, inv.maturity_date)
    const pFmt = naira(inv.principal)
    const vFmt = naira(curVal)

    const badgeMap = {
        active: { label: 'Active', cls: 'active-badge' },
        matured: { label: 'Matured', cls: 'matured-badge' },
        liquidated: { label: 'Liquidated', cls: 'liquidated-badge' },
    }
    const badge = badgeMap[inv.status] || { label: inv.status, cls: 'active-badge' }

    return `
    <div class="inv-card" style="animation-delay:${delay}s">
        <div class="inv-card-header">
            <div class="inv-badge ${badge.cls}">${badge.label}</div>
            <div class="inv-ref">${inv.reference}</div>
        </div>
        <div class="inv-card-body">
            <div class="inv-type">${inv.type}</div>
            <div class="inv-amount">${pFmt}</div>
            <div class="inv-meta-grid">
                <div class="inv-meta-item">
                    <div class="inv-meta-label">Interest Rate</div>
                    <div class="inv-meta-val orange">${inv.interest_rate}% p.a.</div>
                </div>
                <div class="inv-meta-item">
                    <div class="inv-meta-label">Current Value</div>
                    <div class="inv-meta-val green">${vFmt}</div>
                </div>
                <div class="inv-meta-item">
                    <div class="inv-meta-label">Start Date</div>
                    <div class="inv-meta-val">${fmtDate(inv.start_date)}</div>
                </div>
                <div class="inv-meta-item">
                    <div class="inv-meta-label">Maturity Date</div>
                    <div class="inv-meta-val">${fmtDate(inv.maturity_date)}</div>
                </div>
            </div>
            <div class="inv-progress-wrap">
                <div class="inv-progress-header">
                    <span class="inv-progress-label">Tenure Progress</span>
                    <span class="inv-progress-pct">${progress}%</span>
                </div>
                <div class="inv-progress-track">
                    <div class="inv-progress-fill" data-width="${progress}"></div>
                </div>
                <div class="inv-progress-dates">
                    <span>${fmtShort(inv.start_date)}</span>
                    <span>${fmtShort(inv.maturity_date)}</span>
                </div>
            </div>
        </div>
        <div class="inv-card-footer">
            ${inv.status === 'active' ? `
            <button class="btn-liquidate" onclick="openLiquidateModal('${inv.reference}','${pFmt}','${vFmt}')">
                💸 Liquidate
            </button>
            <button class="btn-topup" onclick="openAddModal('${inv.reference}')">
                ➕ Top Up
            </button>` : `<span style="font-size:12px;color:var(--text-dim)">No actions available</span>`}
        </div>
    </div>`
}

// ── Main ─────────────────────────────────────────────────
async function loadInvestments() {
    const db = window._db
    console.log('🔄 loadInvestments started, db:', db, 'window._db:', window._db)
    if (!db) { console.error('❌ db is undefined — window._db not set yet'); return }
    const { data: { session } } = await db.auth.getSession()
    if (!session) { window.location.replace('login-page.html'); return }

    const uid = session.user.id
    console.log('👤 session:', session, 'uid:', uid)
    // Profile — sidebar chip
    const { data: profile } = await db
        .from('profiles')
        .select('first_name, last_name, investor_id, avatar_initials')
        .eq('id', uid)
        .single()
    console.log('👤 profile:', profile)

    if (profile) {
        const fullName = profile.first_name + ' ' + profile.last_name
        set('sidebar-avatar', profile.avatar_initials ||
            fullName.split(' ').map(w => w[0]).join('').toUpperCase())
        set('sidebar-investor-name', fullName)
        set('sidebar-investor-id', 'ID: ' + profile.investor_id)
    }

    // All investments
    const { data: invs, error } = await db
        .from('investments')
        .select('*')
        .eq('investor_id', uid)
        .order('start_date', { ascending: false })
    console.log('📦 investments:', invs, 'error:', error)

    if (error || !invs) { console.error(error); return }

    // Summary strip
    const totalInvested = invs.reduce((s, i) => s + Number(i.principal), 0)
    const totalValue = invs.reduce((s, i) => s + i.principal + calcAccrued(i.principal, i.interest_rate, i.start_date), 0)
    const totalInterest = totalValue - totalInvested
    const activeCount = invs.filter(i => i.status === 'active').length

    set('summary-total-invested', naira(totalInvested))
    set('summary-total-value', naira(totalValue))
    set('summary-total-interest', naira(totalInterest))
    set('summary-active-count', activeCount.toString())

    // Render cards
    const grid = document.getElementById('investments-grid')
    if (!grid) return

    if (invs.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim);">
                <div style="font-size:48px;margin-bottom:16px;">📁</div>
                <div style="font-size:16px;font-weight:600;color:var(--blue);margin-bottom:8px;">No investments yet</div>
                <div style="font-size:13px;">Click "Add Investment" to get started.</div>
            </div>`
    } else {
        grid.innerHTML = invs.map((inv, i) => buildCard(inv, 0.1 * (i + 1))).join('')
        setTimeout(() => {
            grid.querySelectorAll('.inv-progress-fill').forEach(fill => {
                fill.style.width = (fill.dataset.width || 0) + '%'
            })
        }, 300)
    }
}

loadInvestments().then(() => console.log('✅ loadInvestments complete')).catch(e => console.error('❌ loadInvestments failed:', e))