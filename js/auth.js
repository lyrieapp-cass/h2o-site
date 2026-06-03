/* ============================================================
   H2O WRITES — auth.js
   Auth state management — runs on every page
   ============================================================ */

window.H2O = window.H2O || {};

// ── Wait for Supabase to be ready ─────────────────────────
function onSupabaseReady(cb) {
    if (window.supabase && window.supabase.auth) {
        cb();
    } else {
        window.addEventListener('supabase-ready', cb, { once: true });
    }
}

// ── Apply auth UI state ────────────────────────────────────
function applyAuthUI(user, profile) {
    const loginBtn     = document.getElementById('nav-login-btn');
    const bellWrap     = document.getElementById('nav-bell-wrap');
    const avatarWrap   = document.getElementById('nav-avatar-wrap');
    const avatarBtn    = document.getElementById('nav-avatar-btn');
    const dropdownName = document.getElementById('dropdown-name');
    const dropdownHandle = document.getElementById('dropdown-handle');

    if (user && profile) {
        // Logged in
        if (loginBtn)     loginBtn.style.display     = 'none';
        if (bellWrap)     bellWrap.style.display     = 'flex';
        if (avatarWrap)   avatarWrap.style.display   = 'flex';
        if (avatarBtn)    avatarBtn.textContent       = profile.display_name.charAt(0).toUpperCase();
        if (dropdownName) dropdownName.textContent    = profile.display_name;
        if (dropdownHandle) dropdownHandle.textContent = '@' + profile.handle;

        // Store on H2O
        window.H2O.user    = user;
        window.H2O.profile = profile;
        window.H2O.isLoggedIn = () => true;

        // Show continue reading if on homepage
        loadContinueReading(profile);

        // Check unread notifications
        checkUnreadNotifications(user.id);

        // Sign out handler
        const signoutBtn = document.getElementById('signout-btn');
        if (signoutBtn) {
            signoutBtn.addEventListener('click', async () => {
                await window.supabase.auth.signOut();
                location.href = 'index.html';
            });
        }

    } else {
        // Logged out
        if (loginBtn)   loginBtn.style.display   = 'flex';
        if (bellWrap)   bellWrap.style.display   = 'none';
        if (avatarWrap) avatarWrap.style.display = 'none';

        window.H2O.user    = null;
        window.H2O.profile = null;
        window.H2O.isLoggedIn = () => false;
    }
}

// ── Fetch profile from DB ──────────────────────────────────
async function fetchProfile(userId) {
    const { data, error } = await window.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) return null;
    return data;
}

// ── Check unread notifications + populate bell dropdown ───
async function checkUnreadNotifications(userId) {
    const { data: notifs } = await window.supabase
        .from('notifications')
        .select('*, stories(title, slug), chapters(num, title)')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

    const count = notifs?.length || 0;

    if (count > 0) {
        const bellDot   = document.getElementById('bell-dot');
        const mobileDot = document.getElementById('mobile-unread-dot');
        if (bellDot)   bellDot.style.display   = 'block';
        if (mobileDot) mobileDot.style.display = 'block';
    }

    // Populate bell dropdown body
    const dropdownBody = document.getElementById('bell-dropdown-body');
    if (!dropdownBody) return;

    if (!notifs || notifs.length === 0) {
        dropdownBody.innerHTML = '<div class="empty-state" style="padding:24px 16px;font-size:13px">No new notifications.</div>';
        return;
    }

    function timeAgo(d) {
        const diff = Math.floor((Date.now() - new Date(d)) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return Math.floor(diff/60) + 'm ago';
        if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
        return Math.floor(diff/86400) + 'd ago';
    }

    dropdownBody.innerHTML = notifs.map(n => {
        const title  = n.stories?.title || 'Story';
        const slug   = n.stories?.slug  || '';
        const chNum  = n.chapters?.num  || 1;
        const detail = n.type === 'new_chapter'
            ? `New chapter: Ch.${String(chNum).padStart(2,'0')}`
            : 'Someone replied to your comment';
        const href = slug ? `read.html?slug=${slug}&ch=${chNum}` : 'notifications.html';
        return `
            <a class="notif-item is-unread" href="${href}" style="text-decoration:none">
                <div class="notif-item__body">
                    <div class="notif-item__title">${title}</div>
                    <div class="notif-item__detail">${detail}</div>
                </div>
                <div class="notif-item__time">${timeAgo(n.created_at)}</div>
            </a>
        `;
    }).join('');
}

// ── Continue reading (homepage only) ──────────────────────
async function loadContinueReading(profile) {
    const wrap = document.getElementById('continue-reading-wrap');
    if (!wrap) return;

    const { data } = await window.supabase
        .from('read_history')
        .select(`
            read_at,
            chapters ( id, num, title, story_id ),
            stories ( id, slug, title, cover_url )
        `)
        .eq('user_id', window.H2O.user.id)
        .order('read_at', { ascending: false })
        .limit(1)
        .single();

    if (!data) return;

    wrap.style.display = 'block';
    const crStory   = document.getElementById('cr-story');
    const crChapter = document.getElementById('cr-chapter');
    const crCover   = document.getElementById('cr-cover');
    const crCard    = document.getElementById('continue-reading-card');

    if (crStory)   crStory.textContent   = data.stories.title;
    if (crChapter) crChapter.textContent = `Ch.${String(data.chapters.num).padStart(2,'0')}: ${data.chapters.title}`;
    if (crCover && data.stories.cover_url) crCover.src = data.stories.cover_url;
    if (crCard)    crCard.href = `read.html?slug=${data.stories.slug}&ch=${data.chapters.num}`;
}

// ── Boot ──────────────────────────────────────────────────
onSupabaseReady(async () => {
    const { data: { session } } = await window.supabase.auth.getSession();

    if (session?.user) {
        const profile = await fetchProfile(session.user.id);

        // Ban check
        if (profile?.is_banned) {
            await window.supabase.auth.signOut();
            applyAuthUI(null, null);
            return;
        }

        applyAuthUI(session.user, profile);

        // Redirect admin to dashboard if on login page
        const path = window.location.pathname;
        if (path.includes('login.html') || path.includes('register.html')) {
            location.href = profile?.is_admin ? 'admin/dashboard.html' : 'index.html';
        }

    } else {
        applyAuthUI(null, null);

        // Redirect away from profile/notifications if not logged in
        const path = window.location.pathname;
        const protectedPages = ['profile.html', 'notifications.html'];
        if (protectedPages.some(p => path.includes(p))) {
            location.href = 'login.html';
        }
    }

    // Listen for auth state changes
    window.supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            const profile = await fetchProfile(session.user.id);
            applyAuthUI(session.user, profile);
        } else if (event === 'SIGNED_OUT') {
            applyAuthUI(null, null);
        }
    });
});
