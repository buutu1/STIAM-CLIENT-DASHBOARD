// ═══════════════════════════════════════════════════════════
// ADMIN.JS — shared JS for all admin pages
// ═══════════════════════════════════════════════════════════

// ─── SESSION GUARD ───────────────────────────────────────────
function requireAdmin() {
    if (!sessionStorage.getItem("isAdminLoggedIn")) {
        window.location.replace("admin-login.html");
    }
}
function clearAdminSession() {
    sessionStorage.removeItem("isAdminLoggedIn");
}
function setAdminSession() {
    sessionStorage.setItem("isAdminLoggedIn", "true");
}

if (document.getElementById("admin-main")) {
    requireAdmin();
}

// ─── ADMIN LOGIN FORM ────────────────────────────────────────
const adminLoginForm = document.getElementById("admin-login-form");
if (adminLoginForm) {
    const ADMIN = { email: "admin@stiassets.com", password: "admin2025" };

    adminLoginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const email = document.getElementById("admin-email").value.trim();
        const password = document.getElementById("admin-password").value.trim();
        const errEl = document.getElementById("admin-login-error");
        const btn = document.getElementById("admin-login-btn");

        errEl.textContent = "";
        if (!email || !password) { errEl.textContent = "Please enter your credentials."; return; }

        btn.textContent = "Verifying…";
        btn.disabled = true;

        setTimeout(() => {
            if (email === ADMIN.email && password === ADMIN.password) {
                setAdminSession();
                window.location.href = "admin-dashboard.html";
            } else {
                errEl.textContent = "Invalid admin credentials.";
                btn.textContent = "Sign In";
                btn.disabled = false;
            }
        }, 700);
    });
}

// ─── SIDEBAR ────────────────────────────────────────────────
(function initSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggle = document.getElementById("sidebar-toggle");
    const main = document.getElementById("admin-main");
    if (!sidebar || !toggle) return;

    const KEY = "sti_admin_sidebar_collapsed";

    function applyState(collapsed) {
        sidebar.classList.toggle("collapsed", collapsed);
        if (main) main.classList.toggle("sidebar-collapsed", collapsed);
    }

    toggle.addEventListener("click", () => {
        const now = !sidebar.classList.contains("collapsed");
        applyState(now);
        try { localStorage.setItem(KEY, now ? "1" : "0"); } catch (e) { }
    });

    // Init
    let saved = false;
    try { const s = localStorage.getItem(KEY); if (s !== null) saved = s === "1"; } catch (e) { }
    applyState(window.innerWidth <= 768 ? true : saved);

    // Active nav
    const page = window.location.pathname.split("/").pop();
    document.querySelectorAll(".nav-item").forEach(item => {
        const href = item.getAttribute("href") || "";
        item.classList.toggle("active", href === page);
    });

    // Logout
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            clearAdminSession();
            window.location.replace("admin-login.html");
        });
    }
})();

// ─── TOAST ──────────────────────────────────────────────────
function showToast(message, type = "default") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = type === "success" ? "#16A34A" : type === "danger" ? "#e05252" : "#033669";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 4000);
}

// ─── MODAL HELPERS ───────────────────────────────────────────
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("open");
}
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("open");
}
document.querySelectorAll(".modal-overlay").forEach(o => {
    o.addEventListener("click", e => { if (e.target === o) o.classList.remove("open"); });
});

// ─── SEARCH FILTER (generic table) ──────────────────────────
function filterTable(inputId, tableId) {
    const val = document.getElementById(inputId)?.value.toLowerCase() || "";
    document.querySelectorAll(`#${tableId} tbody tr`).forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(val) ? "" : "none";
    });
}

// ─── DATE HELPERS ────────────────────────────────────────────
function today() {
    return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
function setDateBadge() {
    const el = document.getElementById("today-date");
    if (el) el.textContent = today();
}
document.addEventListener("DOMContentLoaded", setDateBadge);

// ─── INVESTMENT MANAGEMENT ──────────────────────────────────
function openAddInvestmentModal() { openModal("add-investment-modal"); }
function submitNewInvestment() {
    const investor = document.getElementById("inv-investor")?.value;
    const amount = document.getElementById("inv-amount")?.value;
    const type = document.getElementById("inv-type")?.value;
    const rate = document.getElementById("inv-rate")?.value;
    const tenure = document.getElementById("inv-tenure")?.value;

    if (!investor || !amount || !type || !rate || !tenure) {
        showToast("⚠️ Please fill in all required fields.", "danger"); return;
    }
    closeModal("add-investment-modal");
    showToast(`✅ Investment created for ${investor} — ₦${Number(amount).toLocaleString()}`, "success");
}

// ─── LIQUIDATION ACTIONS ─────────────────────────────────────
function approveLiquidation(ref) {
    showToast(`✅ Liquidation for ${ref} approved. Payout will be processed within 2 business days.`, "success");
}
function rejectLiquidation(ref) {
    showToast(`❌ Liquidation for ${ref} rejected. Investor will be notified.`, "danger");
}

// ─── SUPPORT TICKET ACTIONS ──────────────────────────────────
function openTicket(ticketId) { openModal("ticket-modal"); }
function submitReply() {
    const msg = document.getElementById("reply-message")?.value?.trim();
    if (!msg || msg.length < 5) { showToast("⚠️ Please enter a reply message.", "danger"); return; }
    document.getElementById("reply-message").value = "";
    closeModal("ticket-modal");
    showToast("✅ Reply sent to investor.", "success");
}
function closeTicket(id) {
    showToast("✅ Ticket marked as resolved.", "success");
}

// ─── USER MANAGEMENT ────────────────────────────────────────
function openCreateUserModal() { openModal("create-user-modal"); }
function submitCreateUser() {
    const name = document.getElementById("new-user-name")?.value?.trim();
    const email = document.getElementById("new-user-email")?.value?.trim();
    if (!name || !email) { showToast("⚠️ Name and email are required.", "danger"); return; }
    closeModal("create-user-modal");
    showToast(`✅ Investor account created for ${name}. Login credentials sent to ${email}.`, "success");
}
function resetUserPassword(name) {
    showToast(`✅ Password reset link sent to ${name}.`, "success");
}
function suspendUser(name) {
    showToast(`⚠️ ${name}'s account has been suspended.`, "danger");
}

// ─── STATEMENT GENERATOR ────────────────────────────────────
function generateStatement() {
    const investor = document.getElementById("gen-investor")?.value;
    const type = document.getElementById("gen-type")?.value;
    const ref = document.getElementById("gen-ref")?.value;
    if (!investor || !type || !ref) { showToast("⚠️ Please fill all fields.", "danger"); return; }
    showToast(`✅ Statement generated for ${investor}. PDF sent to their email.`, "success");
}

// ═══════════════════════════════════════════════════════════
// MACRO INDICATORS EDITOR
// ═══════════════════════════════════════════════════════════

const MACRO_INDICATORS = [
    'mpr', 'tbill', 'bond', 'plr',
    'inf', 'food', 'usdngn', 'parallel',
    'gdp', 'oil', 'pmi', 'unemp',
    'res', 'deficit', 'debt', 'trade'
];

const MACRO_DIR_ARROWS = { pos: '▲', neg: '▼', neu: '≈' };

let macroDirtyFields = new Set();

function livePreview(id) {
    const valEl = document.getElementById(id + '-val');
    const chgEl = document.getElementById(id + '-chg');
    const dirEl = document.getElementById(id + '-dir');
    if (!valEl) return;

    const val = valEl.value || '';
    const chg = chgEl ? chgEl.value : '';
    const dir = dirEl ? dirEl.value : 'neu';

    const prevVal = document.getElementById('prev-' + id + '-val');
    const prevChg = document.getElementById('prev-' + id + '-chg');

    if (prevVal) prevVal.textContent = val;
    if (prevChg) {
        prevChg.textContent = MACRO_DIR_ARROWS[dir] + ' ' + chg;
        prevChg.className = 'icard-preview-change ' + dir;
    }

    macroMarkDirty('card-' + id, 'status-' + id);
}

function macroMarkDirty(cardId, statusId) {
    const card = document.getElementById(cardId);
    const status = document.getElementById(statusId);
    if (card) card.classList.add('dirty');
    if (status) { status.textContent = 'Unsaved'; status.className = 'icard-status changed'; }
    macroDirtyFields.add(cardId);
    updateMacroDirtyCount();
}

function updateMacroDirtyCount() {
    const el = document.getElementById('dirty-count');
    if (el) el.textContent = macroDirtyFields.size;
}

function saveAndPublish() {
    if (!macroDirtyFields.size) {
        showToast('No changes to publish.', 'default');
        return;
    }

    const btn = document.querySelector('.save-bar .btn-orange');
    if (!btn) return;
    const originalText = btn.textContent;
    btn.textContent = 'Publishing…';
    btn.disabled = true;

    setTimeout(() => {
        // Collect all values — in a real Supabase setup you'd POST these
        const payload = {};
        MACRO_INDICATORS.forEach(id => {
            const valEl = document.getElementById(id + '-val');
            const chgEl = document.getElementById(id + '-chg');
            const dirEl = document.getElementById(id + '-dir');
            const descEl = document.getElementById(id + '-desc');
            const periodEl = document.getElementById(id + '-period');
            if (valEl) payload[id] = {
                value: valEl.value,
                change: chgEl ? chgEl.value : '',
                dir: dirEl ? dirEl.value : 'neu',
                desc: descEl ? descEl.value : '',
                period: periodEl ? periodEl.value : ''
            };
        });
        // Implications
        [1, 2, 3, 4].forEach(n => {
            const t = document.getElementById('impl-' + n + '-title');
            const b = document.getElementById('impl-' + n + '-body');
            if (t) payload['impl_' + n] = { title: t.value, body: b ? b.value : '' };
        });
        const lu = document.getElementById('last-updated');
        if (lu) payload['last_updated'] = lu.value;

        console.log('Macro payload ready for Supabase:', payload);

        // Reset dirty state
        macroDirtyFields.clear();
        updateMacroDirtyCount();
        document.querySelectorAll('.indicator-card').forEach(c => c.classList.remove('dirty'));
        document.querySelectorAll('.icard-status').forEach(s => {
            s.textContent = 'Live';
            s.className = 'icard-status live';
        });

        btn.textContent = originalText;
        btn.disabled = false;
        showToast('✅ Macro indicators published! Investor portal is now up to date.', 'success');
    }, 1200);
}

function resetMacroForm() {
    if (!macroDirtyFields.size) return;
    if (!confirm('Reset all unsaved changes? This cannot be undone.')) return;
    location.reload();
}

// Wire up all macro inputs to dirty tracking on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('macro-form')) return;

    document.querySelectorAll(
        '.icard-fields input, .icard-fields textarea, .icard-fields select, ' +
        '.impl-card input, .impl-card textarea, #last-updated'
    ).forEach(el => {
        el.addEventListener('input', () => updateMacroDirtyCount());
        el.addEventListener('change', () => updateMacroDirtyCount());
    });
});
// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS PAGE — notifications.js
// Add this to your app.js or link as a separate file
// ═══════════════════════════════════════════════════════════

// ── Filter tabs ──────────────────────────────────────────
function filterNotifs(type, btn) {
    document.querySelectorAll('.notif-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');

    const items = document.querySelectorAll('.notif-item');
    let visible = 0;

    items.forEach(item => {
        const match = type === 'all'
            || (type === 'unread' && item.classList.contains('unread'))
            || item.dataset.type === type;

        item.classList.toggle('hidden', !match);
        if (match) visible++;
    });

    document.getElementById('visible-count').textContent = visible;
    document.getElementById('footer-count').textContent =
        'Showing ' + visible + ' notification' + (visible !== 1 ? 's' : '');
    document.getElementById('notif-empty').style.display = visible === 0 ? 'block' : 'none';
}

// ── Mark single item read ────────────────────────────────
function markRead(el) {
    if (!el.classList.contains('unread')) return;
    el.classList.remove('unread');
    const dot = el.querySelector('.notif-dot');
    if (dot) dot.remove();
    updateUnreadCount();
}

// ── Mark all read ────────────────────────────────────────
function markAllRead() {
    document.querySelectorAll('.notif-item.unread').forEach(item => {
        item.classList.remove('unread');
        const dot = item.querySelector('.notif-dot');
        if (dot) dot.remove();
    });
    updateUnreadCount();
    showToast('All notifications marked as read.');
}

// ── Update unread count badge ────────────────────────────
function updateUnreadCount() {
    const count = document.querySelectorAll('.notif-item.unread').length;
    document.getElementById('count-unread').textContent = count;
    document.getElementById('unread-badge').textContent = count + ' Unread';
    if (count === 0) document.getElementById('unread-badge').textContent = 'All Read';
}

// ── Preference toggle ────────────────────────────────────
function prefChanged(input, name) {
    const state = input.checked ? 'enabled' : 'disabled';
    showToast((input.checked ? '✅' : '🔕') + ' ' + name + ' ' + state + '.');
}

// ── Toast ────────────────────────────────────────────────
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Sidebar toggle (matches app.js pattern) ──────────────
(function () {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    const main = document.getElementById('main-content');
    if (!sidebar || !toggle) return;
    const KEY = 'sti_sidebar_collapsed';
    function apply(collapsed) {
        sidebar.classList.toggle('collapsed', collapsed);
        if (main) main.classList.toggle('expanded', collapsed);
    }
    toggle.addEventListener('click', () => {
        const now = !sidebar.classList.contains('collapsed');
        apply(now);
        try { localStorage.setItem(KEY, now ? '1' : '0'); } catch (e) { }
    });
    let saved = false;
    try { const s = localStorage.getItem(KEY); if (s !== null) saved = s === '1'; } catch (e) { }
    apply(window.innerWidth <= 768 ? false : saved);

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => { window.location.href = 'admin-login.html'; });
})();