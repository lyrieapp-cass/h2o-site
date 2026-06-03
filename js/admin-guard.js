/* ============================================================
   H2O WRITES — admin-guard.js
   Blocks non-admin users from accessing admin pages
   ============================================================ */

(function () {
    function waitForSupabase() {
        return new Promise(resolve => {
            if (window.supabase && window.supabase.from) return resolve();
            window.addEventListener('supabase-ready', resolve, { once: true });
        });
    }

    async function checkAdmin() {
        await waitForSupabase();

        const { data: { session } } = await window.supabase.auth.getSession();

        // Not logged in → redirect to login
        if (!session) {
            location.href = '../login.html';
            return;
        }

        // Check if admin
        const { data: profile } = await window.supabase
            .from('profiles')
            .select('is_admin, is_banned')
            .eq('id', session.user.id)
            .single();

        // Banned or not admin → redirect to home
        if (!profile || !profile.is_admin || profile.is_banned) {
            location.href = '../index.html';
            return;
        }

        // All good — show the page
        document.body.style.display = 'flex';
    }

    // Hide page until auth check passes
    document.addEventListener('DOMContentLoaded', function () {
        document.body.style.display = 'none';
        checkAdmin();
    });
})();