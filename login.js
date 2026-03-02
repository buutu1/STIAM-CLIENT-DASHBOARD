// ═══════════════════════════════════════════════════════════
// app.js — STI Assets Management
// ═══════════════════════════════════════════════════════════

// ─── SUPABASE CONFIG ─────────────────────────────────────────
const SUPABASE_URL = 'https://gccrloiulxkysdkoqwcq.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjY3Jsb2l1bHhreXNka29xd2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjEyMzAsImV4cCI6MjA4NzY5NzIzMH0.gI_Kfs9-SaGGvIU_OiOGGOWt3DDJ9rvD1CSqZ_CPa9c';


// ═══════════════════════════════════════════════════════════
// SESSION GUARD
// Protects all pages that have a sidebar (main-content).
// Supabase handles the real session — this checks it exists.
// ═══════════════════════════════════════════════════════════
const _db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
window._db = _db

if (document.getElementById('main-content')) {
    _db.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) { window.location.replace('index.html'); return }

        // Update sidebar chip on every page
        const { data: profile } = await _db
            .from('profiles')
            .select('first_name, last_name, investor_id, avatar_initials, relationship_manager, phone')
            .eq('id', session.user.id)
            .single()

        if (profile) {
            const fullName = profile.first_name + ' ' + profile.last_name
            const initials = profile.avatar_initials ||
                fullName.split(' ').map(w => w[0]).join('').toUpperCase()
            const el = id => document.getElementById(id)

            // Sidebar chip — every page
            if (el('sidebar-avatar')) el('sidebar-avatar').textContent = initials
            if (el('sidebar-investor-name')) el('sidebar-investor-name').textContent = fullName
            if (el('sidebar-investor-id')) el('sidebar-investor-id').textContent = 'ID: ' + profile.investor_id

            // Account Summary card — settings page
            if (el('account-avatar')) el('account-avatar').textContent = initials
            if (el('account-investor-name')) el('account-investor-name').textContent = fullName
            if (el('account-investor-id')) el('account-investor-id').textContent = 'ID: ' + profile.investor_id
            if (el('account-id-display')) el('account-id-display').textContent = profile.investor_id
            if (el('account-rm')) el('account-rm').textContent = profile.relationship_manager || '—'

            // Profile form fields — settings page
            if (el('first-name')) el('first-name').value = profile.first_name
            if (el('last-name')) el('last-name').value = profile.last_name
            if (el('phone')) el('phone').value = profile.phone || ''
        }
    })
}


// ═══════════════════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════════════════
(function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    const main = document.getElementById('main-content');
    const backdrop = document.getElementById('sidebar-backdrop');
    const pill = document.getElementById('mobile-open-pill');

    if (!sidebar || !toggle) return;

    const STORAGE_KEY = 'sti_sidebar_collapsed';

    if (pill) pill.style.display = 'none';
    if (backdrop) backdrop.style.display = 'none';

    function isMobile() { return window.innerWidth <= 768; }
    function isCollapsed() { return sidebar.classList.contains('collapsed'); }

    function applyState(collapsed) {
        sidebar.classList.toggle('collapsed', collapsed);
        if (main) main.classList.toggle('sidebar-collapsed', collapsed);
    }

    toggle.addEventListener('click', () => {
        const nowCollapsed = !isCollapsed();
        applyState(nowCollapsed);
        try { localStorage.setItem(STORAGE_KEY, nowCollapsed ? '1' : '0'); } catch (e) { }
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => supabaseSignOut());
    }

    function init() {
        let savedCollapsed = false;
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved !== null) savedCollapsed = saved === '1';
        } catch (e) { }
        applyState(isMobile() ? (savedCollapsed !== false ? savedCollapsed : true) : savedCollapsed);
    }

    init();

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(init, 120);
    });

    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href') || '';
        item.classList.toggle('active', href === currentPage);
    });
})();


// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}


// ═══════════════════════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════════════════════
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('open');
    });
});


// ═══════════════════════════════════════════════════════════
// DASHBOARD PROGRESS BAR
// ═══════════════════════════════════════════════════════════
const progressFill = document.getElementById('progress-fill');
const progressPct = document.getElementById('progress-pct-hero');

if (progressFill && progressPct) {
    const progressValue = parseInt(progressPct.innerText);
    setTimeout(() => { progressFill.style.width = progressValue + '%'; }, 300);
}


// ═══════════════════════════════════════════════════════════
// LIQUIDATION MODAL
// ═══════════════════════════════════════════════════════════
function openLiquidateModal(ref, principal, currentValue) {
    document.getElementById('liq-ref').textContent = ref;
    document.getElementById('liq-principal').textContent = principal;
    document.getElementById('liq-value').textContent = currentValue;

    const numericPrincipal = parseFloat(principal.replace(/[^0-9.-]+/g, ''));
    const numericCurrentValue = parseFloat(currentValue.replace(/[^0-9.-]+/g, ''));
    const gain = numericCurrentValue - numericPrincipal;
    const penalty = gain * 0.10;
    const balance = numericCurrentValue - penalty;

    document.getElementById('liq-cost').textContent =
        '₦' + penalty.toLocaleString(undefined, { minimumFractionDigits: 2 });
    document.getElementById('liq-bal').textContent =
        '₦' + balance.toLocaleString(undefined, { minimumFractionDigits: 2 });

    document.getElementById('liq-reason').value = '';
    document.getElementById('liq-notes').value = '';
    openModal('liquidate-modal');
}

function submitLiquidate() {
    const reason = document.getElementById('liq-reason').value;
    const ref = document.getElementById('liq-ref').textContent;

    if (!reason) {
        showToast('⚠️ Please select a reason for liquidation.');
        return;
    }

    closeModal('liquidate-modal');
    showToast(`✅ Liquidation request for ${ref} submitted. Our team will contact you within 2–5 business days.`);
}


// ═══════════════════════════════════════════════════════════
// ADD / TOP-UP MODAL → PAYMENT RECEIPT MODAL
// ═══════════════════════════════════════════════════════════
function openAddModal(ref) {
    document.getElementById('add-ref').value = ref || 'New Investment';
    document.getElementById('add-amount').value = '';
    document.getElementById('add-type').value = '';
    document.getElementById('add-tenure').value = '';
    document.getElementById('add-notes').value = '';
    openModal('add-modal');
}

const btnAddInvestment = document.getElementById('btn-add-investment');
if (btnAddInvestment) {
    btnAddInvestment.addEventListener('click', () => openAddModal(''));
}

function submitAdd() {
    const amount = document.getElementById('add-amount').value.trim();
    const type = document.getElementById('add-type').value;
    const tenure = document.getElementById('add-tenure').value;

    if (!amount || isNaN(amount) || Number(amount) < 100000) {
        showToast('⚠️ Minimum investment amount is ₦100,000.'); return;
    }
    if (!type) { showToast('⚠️ Please select an investment type.'); return; }
    if (!tenure) { showToast('⚠️ Please select a tenure.'); return; }

    const formatted = '₦' + Number(amount).toLocaleString('en-NG', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    });

    closeModal('add-modal');
    resetReceiptUpload();
    document.getElementById('payment-amount-display').textContent = formatted;
    openModal('payment-modal');
}


// ═══════════════════════════════════════════════════════════
// PAYMENT RECEIPT UPLOAD
// ═══════════════════════════════════════════════════════════
let selectedReceiptFile = null;

function closePaymentModal() {
    closeModal('payment-modal');
    resetReceiptUpload();
}

function handleReceiptFile(input) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showToast('⚠️ File is too large. Maximum size is 5MB.');
        input.value = ''; return;
    }

    selectedReceiptFile = file;
    document.getElementById('receipt-upload-area').style.display = 'none';
    document.getElementById('receipt-preview').style.display = 'flex';
    document.getElementById('receipt-file-name').textContent = file.name;
    document.getElementById('receipt-file-size').textContent =
        (file.size / 1024).toFixed(1) + ' KB';
}

function removeReceipt() { resetReceiptUpload(); }

function resetReceiptUpload() {
    selectedReceiptFile = null;
    const input = document.getElementById('receipt-file');
    const uploadArea = document.getElementById('receipt-upload-area');
    const preview = document.getElementById('receipt-preview');
    const fname = document.getElementById('receipt-file-name');
    const fsize = document.getElementById('receipt-file-size');
    const notes = document.getElementById('receipt-notes');
    if (input) input.value = '';
    if (uploadArea) uploadArea.style.display = 'block';
    if (preview) preview.style.display = 'none';
    if (fname) fname.textContent = '';
    if (fsize) fsize.textContent = '';
    if (notes) notes.value = '';
}

async function submitReceipt() {
    if (!selectedReceiptFile) {
        showToast('⚠️ Please attach your payment receipt before submitting.');
        return;
    }

    const btn = document.getElementById('receipt-submit-btn');
    btn.textContent = 'Uploading…';
    btn.disabled = true;

    try {
        const db = window._db
        const { data: { session } } = await db.auth.getSession()
        if (!session) { window.location.replace('index.html'); return }

        const uid = session.user.id
        const fileExt = selectedReceiptFile.name.split('.').pop()
        const fileName = uid + '/' + uid + '_' + Date.now() + '.' + fileExt

        // Upload receipt to Supabase Storage
        const { error: uploadError } = await db.storage
            .from('payment-receipts')
            .upload(fileName, selectedReceiptFile)

        if (uploadError) throw uploadError

        // Get signed URL (bucket is private)
        const { data: { signedUrl } } = await db.storage
            .from('payment-receipts')
            .createSignedUrl(fileName, 60 * 60 * 24 * 7) // 7 days

        // Save investment request to database
        const { error: insertError } = await db
            .from('investment_requests')
            .insert({
                investor_id: uid,
                reference: document.getElementById('add-ref').value || null,
                amount: Number(document.getElementById('add-amount').value),
                type: document.getElementById('add-type').value,
                tenure: document.getElementById('add-tenure').value,
                notes: document.getElementById('add-notes').value || null,
                receipt_url: signedUrl,
                receipt_name: selectedReceiptFile.name,
                status: 'pending'
            })

        if (insertError) throw insertError

        closePaymentModal()
        showToast('✅ Receipt submitted! Our team will verify your payment within 24 hours.')

    } catch (err) {
        console.error('Upload failed:', err)
        showToast('⚠️ Upload failed. Please try again.')
    } finally {
        btn.textContent = 'Submit Receipt'
        btn.disabled = false
    }
}

function copyAccount(elementId, btn) {
    const text = document.getElementById(elementId).textContent.trim();
    navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
    });
}


// ═══════════════════════════════════════════════════════════
// ACCOUNT TABS
// ═══════════════════════════════════════════════════════════
const stabs = document.querySelectorAll('.stab');
const tabPanels = document.querySelectorAll('.tab-panel');

if (stabs.length > 0) {
    stabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            stabs.forEach(t => t.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById('tab-' + target);
            if (panel) panel.classList.add('active');
        });
    });
}


// ═══════════════════════════════════════════════════════════
// SAVE PROFILE
// ═══════════════════════════════════════════════════════════
async function saveProfile() {
    const firstName = document.getElementById('first-name');
    const lastName = document.getElementById('last-name');
    const phone = document.getElementById('phone');
    const address = document.getElementById('address');
    const state = document.getElementById('state');
    const lga = document.getElementById('lga');
    const dob = document.getElementById('dob');

    if (!firstName || !firstName.value.trim()) { showToast('⚠️ First name is required.'); return; }
    if (!lastName || !lastName.value.trim()) { showToast('⚠️ Last name is required.'); return; }

    const btn = document.querySelector('[onclick="saveProfile()"]');
    if (btn) { btn.textContent = 'Saving…'; btn.disabled = true; }

    try {
        const db = window._db
        const { data: { session } } = await db.auth.getSession()
        if (!session) { window.location.replace('index.html'); return }

        const updates = {
            first_name: firstName.value.trim(),
            last_name: lastName.value.trim(),
            phone: phone ? phone.value.trim() || null : null,
            address: address ? address.value.trim() || null : null,
            state: state ? state.value || null : null,
            lga: lga ? lga.value.trim() || null : null,
            date_of_birth: dob ? dob.value || null : null,
            updated_at: new Date().toISOString()
        }

        const { error } = await db
            .from('profiles')
            .update(updates)
            .eq('id', session.user.id)

        if (error) throw error

        // Update sidebar and account summary with new name
        const fullName = updates.first_name + ' ' + updates.last_name
        const el = id => document.getElementById(id)
        if (el('sidebar-investor-name')) el('sidebar-investor-name').textContent = fullName
        if (el('account-investor-name')) el('account-investor-name').textContent = fullName
        if (el('sidebar-avatar')) el('sidebar-avatar').textContent =
            fullName.split(' ').map(w => w[0]).join('').toUpperCase()
        if (el('account-avatar')) el('account-avatar').textContent =
            fullName.split(' ').map(w => w[0]).join('').toUpperCase()

        showToast('✅ Profile updated successfully.')

    } catch (err) {
        console.error('Save profile error:', err)
        showToast('⚠️ Failed to save profile. Please try again.')
    } finally {
        if (btn) { btn.textContent = 'Save Changes'; btn.disabled = false; }
    }
}


// ═══════════════════════════════════════════════════════════
// PASSWORD VISIBILITY TOGGLE
// ═══════════════════════════════════════════════════════════
function togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁';
    }
}


// ═══════════════════════════════════════════════════════════
// PASSWORD STRENGTH CHECKER
// ═══════════════════════════════════════════════════════════
function checkStrength(value) {
    const fill = document.getElementById('pw-strength-fill');
    const label = document.getElementById('pw-strength-label');

    const rules = {
        length: value.length >= 8,
        upper: /[A-Z]/.test(value),
        number: /[0-9]/.test(value),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(value),
    };

    const ruleMap = {
        length: 'rule-length', upper: 'rule-upper',
        number: 'rule-number', special: 'rule-special',
    };

    Object.keys(rules).forEach(key => {
        const el = document.getElementById(ruleMap[key]);
        if (!el) return;
        if (rules[key]) {
            el.textContent = el.textContent.replace('✗', '✓');
            el.classList.add('pass');
        } else {
            el.textContent = el.textContent.replace('✓', '✗');
            el.classList.remove('pass');
        }
    });

    const score = Object.values(rules).filter(Boolean).length;
    if (!fill || !label) return;

    const levels = [
        { width: '0%', color: '#E2E8F0', text: '', textColor: '' },
        { width: '25%', color: '#e05252', text: 'Weak', textColor: '#e05252' },
        { width: '50%', color: '#F68634', text: 'Fair', textColor: '#F68634' },
        { width: '75%', color: '#f59e0b', text: 'Good', textColor: '#f59e0b' },
        { width: '100%', color: '#16A34A', text: 'Strong', textColor: '#16A34A' },
    ];

    const level = value.length === 0 ? levels[0] : levels[score];
    fill.style.width = level.width;
    fill.style.background = level.color;
    label.textContent = level.text;
    label.style.color = level.textColor;
}


// ═══════════════════════════════════════════════════════════
// CHANGE PASSWORD
// ═══════════════════════════════════════════════════════════
async function changePassword() {
    const current = document.getElementById('current-pw');
    const newPw = document.getElementById('new-pw');
    const confirm = document.getElementById('confirm-pw');

    if (!current || !current.value) { showToast('⚠️ Please enter your current password.'); return; }
    if (!newPw || newPw.value.length < 8) { showToast('⚠️ New password must be at least 8 characters.'); return; }
    if (!confirm || newPw.value !== confirm.value) { showToast('⚠️ Passwords do not match. Please try again.'); return; }

    const btn = document.querySelector('[onclick="changePassword()"]');
    if (btn) { btn.textContent = 'Updating…'; btn.disabled = true; }

    try {
        const db = window._db

        // Re-authenticate with current password first
        const { data: { session } } = await db.auth.getSession()
        if (!session) { window.location.replace('index.html'); return }

        const { error: signInError } = await db.auth.signInWithPassword({
            email: session.user.email,
            password: current.value
        })

        if (signInError) {
            showToast('⚠️ Current password is incorrect.')
            return
        }

        // Update to new password
        const { error: updateError } = await db.auth.updateUser({
            password: newPw.value
        })

        if (updateError) throw updateError

        current.value = ''
        newPw.value = ''
        confirm.value = ''
        checkStrength('')
        showToast('✅ Password updated successfully.')

    } catch (err) {
        console.error('Password change error:', err)
        showToast('⚠️ Failed to update password. Please try again.')
    } finally {
        if (btn) { btn.textContent = 'Update Password'; btn.disabled = false; }
    }
}


// ═══════════════════════════════════════════════════════════
// FAQ ACCORDION
// ═══════════════════════════════════════════════════════════
function toggleFaq(btn) {
    const answer = btn.nextElementSibling;
    const isOpen = btn.classList.contains('open');

    document.querySelectorAll('.faq-question').forEach(q => q.classList.remove('open'));
    document.querySelectorAll('.faq-answer').forEach(a => a.classList.remove('open'));

    if (!isOpen) {
        btn.classList.add('open');
        answer.classList.add('open');
    }
}


// ═══════════════════════════════════════════════════════════
// SUPPORT TICKET
// ═══════════════════════════════════════════════════════════
async function submitSupportTicket() {
    const subject = document.getElementById('support-subject');
    const message = document.getElementById('support-message');
    const priority = document.getElementById('support-priority');

    if (!subject || !subject.value) { showToast('⚠️ Please select a topic for your request.'); return; }
    if (!message || message.value.trim().length < 10) { showToast('⚠️ Please enter a message with at least 10 characters.'); return; }

    const btn = document.querySelector('.btn-send-support') || document.querySelector('[onclick="submitSupportTicket()"]');
    if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }

    try {
        const db = window._db
        const { data: { session } } = await db.auth.getSession()
        if (!session) { window.location.replace('index.html'); return }

        // Generate ticket number
        const ticketNumber = 'TKT-' + Date.now().toString().slice(-6)

        const { error } = await db
            .from('support_tickets')
            .insert({
                investor_id: session.user.id,
                ticket_number: ticketNumber,
                subject: subject.value,
                message: message.value.trim(),
                priority: priority ? priority.value : 'normal',
                status: 'open'
            })

        if (error) throw error

        const priorityLabel = priority && priority.value === 'urgent' ? 'urgent' : 'normal'
        subject.value = ''
        message.value = ''
        if (priority) priority.value = 'normal'

        showToast(`✅ Ticket ${ticketNumber} submitted (${priorityLabel} priority). We'll respond within 24 hours.`)

    } catch (err) {
        console.error('Support ticket error:', err)
        showToast('⚠️ Submission failed. Please try again.')
    } finally {
        if (btn) { btn.textContent = 'Send Message'; btn.disabled = false; }
    }
}


// ═══════════════════════════════════════════════════════════
// NOTIFICATION BELL POPUP
// ═══════════════════════════════════════════════════════════
(function () {
    const bellBtn = document.getElementById('notif-bell-btn');
    const popup = document.getElementById('notif-popup');
    const overlay = document.getElementById('notif-overlay');
    const closeBtn = document.getElementById('notif-popup-close');
    const markAllBtn = document.getElementById('notif-mark-all');
    const bellDot = document.getElementById('notif-bell-dot');
    const unreadLbl = document.getElementById('notif-unread-label');

    if (!bellBtn || !popup) return;

    const STORAGE_KEY = 'sti_read_notifications';

    function getReadIds() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
        catch (e) { return []; }
    }

    function saveReadId(id) {
        const ids = getReadIds();
        if (!ids.includes(id)) {
            ids.push(id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        }
    }

    function saveAllReadIds() {
        const ids = [];
        document.querySelectorAll('.notif-popup-item').forEach(item => ids.push(item.dataset.id));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }

    function applyReadState() {
        const readIds = getReadIds();
        document.querySelectorAll('.notif-popup-item').forEach(item => {
            if (readIds.includes(item.dataset.id)) {
                item.classList.remove('unread');
                const dot = item.querySelector('.notif-popup-dot');
                if (dot) dot.remove();
            }
        });
        updateBellCount();
    }

    function openPopup() {
        popup.classList.add('open');
        overlay.classList.add('open');
        bellBtn.classList.add('active');
    }

    function closePopup() {
        popup.classList.remove('open');
        overlay.classList.remove('open');
        bellBtn.classList.remove('active');
    }

    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        popup.classList.contains('open') ? closePopup() : openPopup();
    });
    overlay.addEventListener('click', closePopup);
    closeBtn.addEventListener('click', closePopup);

    document.querySelectorAll('.notif-popup-item').forEach(item => {
        item.addEventListener('click', () => {
            if (item.classList.contains('unread')) {
                item.classList.remove('unread');
                const dot = item.querySelector('.notif-popup-dot');
                if (dot) dot.remove();
                saveReadId(item.dataset.id);
                updateBellCount();
            }
        });
    });

    markAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.notif-popup-item.unread').forEach(item => {
            item.classList.remove('unread');
            const dot = item.querySelector('.notif-popup-dot');
            if (dot) dot.remove();
        });
        saveAllReadIds();
        updateBellCount();
    });

    function updateBellCount() {
        const count = document.querySelectorAll('.notif-popup-item.unread').length;
        bellDot.classList.toggle('visible', count > 0);
        unreadLbl.textContent = count > 0
            ? count + ' unread notification' + (count !== 1 ? 's' : '')
            : 'All caught up!';
    }

    applyReadState();
})();


// ═══════════════════════════════════════════════════════════
// PAGE INIT — runs after DOM is ready
// ═══════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {

    // Investment progress bars
    document.querySelectorAll('.inv-progress-fill').forEach(fill => {
        const width = fill.getAttribute('data-width');
        if (width) setTimeout(() => { fill.style.width = width + '%'; }, 300);
    });

    // Receipt upload drag and drop
    const area = document.getElementById('receipt-upload-area');
    if (area) {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });
        area.addEventListener('dragleave', () => area.classList.remove('dragover'));
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                document.getElementById('receipt-file').files = e.dataTransfer.files;
                handleReceiptFile(document.getElementById('receipt-file'));
            }
        });
    }

    // Close payment modal on overlay click
    const paymentModal = document.getElementById('payment-modal');
    if (paymentModal) {
        paymentModal.addEventListener('click', function (e) {
            if (e.target === this) closePaymentModal();
        });
    }
});