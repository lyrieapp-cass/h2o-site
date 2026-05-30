/* ============================================================
   H2O WRITES — main.js
   Session 1A-1 | Shared Scripts
   ============================================================ */

/* ── Theme Toggle ─────────────────────────────────────────── */
(function () {
    const STORAGE_KEY = 'h2o-theme';

    function getPreferred() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return stored;
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    function applyTheme(theme) {
        document.body.classList.toggle('light-mode', theme === 'light');
        localStorage.setItem(STORAGE_KEY, theme);

        // Update all toggle button labels/icons
        document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
            btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
            btn.setAttribute('title', theme === 'dark' ? 'Light mode' : 'Dark mode');
            const iconUse = btn.querySelector('use');
            if (iconUse) {
                iconUse.setAttribute('href', theme === 'dark' ? '#icon-sun' : '#icon-moon');
            }
        });
    }

    function toggleTheme() {
        const current = localStorage.getItem(STORAGE_KEY) || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    }

    // Apply on load immediately (before DOMContentLoaded to avoid flash)
    applyTheme(getPreferred());

    document.addEventListener('DOMContentLoaded', function () {
        // Bind toggle buttons
        document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
            btn.addEventListener('click', toggleTheme);
        });
    });

    // Expose for other scripts
    window.H2O = window.H2O || {};
    window.H2O.toggleTheme = toggleTheme;
    window.H2O.getTheme = () => localStorage.getItem(STORAGE_KEY) || 'dark';
})();

/* ── Scroll-to-top ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
    const scrollBtn = document.getElementById('scroll-top-btn');
    if (!scrollBtn) return;

    function onScroll() {
        scrollBtn.classList.toggle('is-visible', window.scrollY > 300);
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    scrollBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

/* ── Desktop Navbar: Search Expand ───────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
    const searchWrap = document.querySelector('.navbar__search-wrap');
    const searchInput = searchWrap ? searchWrap.querySelector('.navbar__search-input') : null;
    const searchBtn = searchWrap ? searchWrap.querySelector('.icon-btn--search') : null;

    if (!searchWrap || !searchInput) return;

    function openSearch() {
        searchWrap.classList.add('is-open');
        searchInput.focus();
    }

    function closeSearch() {
        searchWrap.classList.remove('is-open');
        searchInput.value = '';
        const resultsBox = searchWrap.querySelector('.navbar__search-results');
        if (resultsBox) resultsBox.classList.remove('has-results');
    }

    if (searchBtn) {
        searchBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (searchWrap.classList.contains('is-open')) {
                closeSearch();
            } else {
                openSearch();
            }
        });
    }

    searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeSearch();
    });

    // Live search hook — stories data passed in by each page
    searchInput.addEventListener('input', function () {
        const query = this.value.trim().toLowerCase();
        const resultsBox = searchWrap.querySelector('.navbar__search-results');
        if (!resultsBox) return;

        if (!query) {
            resultsBox.classList.remove('has-results');
            resultsBox.innerHTML = '';
            return;
        }

        if (typeof window.H2O_STORIES !== 'undefined') {
            const matches = window.H2O_STORIES.filter(s =>
                s.title.toLowerCase().includes(query)
            ).slice(0, 6);

            if (matches.length === 0) {
                resultsBox.innerHTML = '<div class="search-no-results">No stories found.</div>';
                resultsBox.classList.add('has-results');
            } else {
                resultsBox.innerHTML = matches.map(s => `
                    <a class="search-result-item" href="story.html?slug=${s.slug}">
                        <div class="cover-wrapper" style="width:32px;flex-shrink:0;">
                            ${s.cover ? `<img src="${s.cover}" alt="">` : ''}
                        </div>
                        <span>${escapeHtml(s.title)}</span>
                    </a>
                `).join('');
                resultsBox.classList.add('has-results');
            }
        }
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
        if (searchWrap.classList.contains('is-open') && !searchWrap.contains(e.target)) {
            closeSearch();
        }
    });
});

/* ── Avatar Dropdown ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
    const avatarBtn = document.querySelector('.avatar-btn');
    const avatarDropdown = document.querySelector('.avatar-dropdown');
    if (!avatarBtn || !avatarDropdown) return;

    avatarBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        avatarDropdown.classList.toggle('is-open');
    });

    document.addEventListener('click', function (e) {
        if (!avatarDropdown.contains(e.target) && e.target !== avatarBtn) {
            avatarDropdown.classList.remove('is-open');
        }
    });
});

/* ── Bell Dropdown ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
    const bellBtn = document.querySelector('.icon-btn--bell');
    const bellDropdown = document.querySelector('.bell-dropdown');
    if (!bellBtn || !bellDropdown) return;

    bellBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        bellDropdown.classList.toggle('is-open');
    });

    document.addEventListener('click', function (e) {
        if (!bellDropdown.contains(e.target) && e.target !== bellBtn) {
            bellDropdown.classList.remove('is-open');
        }
    });

    // Tab switching
    bellDropdown.querySelectorAll('.bell-dropdown__tab').forEach(tab => {
        tab.addEventListener('click', function () {
            bellDropdown.querySelectorAll('.bell-dropdown__tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            // Future: swap tab content panels
        });
    });
});

/* ── Mobile Bottom Nav ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
    const mobileNav = document.querySelector('.mobile-nav');
    if (!mobileNav) return;

    // Mark active tab by current page
    const path = window.location.pathname;
    const tabs = mobileNav.querySelectorAll('[data-page]');
    tabs.forEach(tab => {
        const page = tab.getAttribute('data-page');
        if (
            (page === 'home'    && (path.endsWith('index.html') || path === '/' || path.endsWith('/'))) ||
            (page === 'stories' && path.includes('stories.html')) ||
            (page === 'search'  && path.includes('search'))       ||
            (page === 'notifs'  && path.includes('notifications')) ||
            (page === 'profile' && path.includes('profile'))
        ) {
            tab.classList.add('active');
        }
    });
});

/* ── Logged-out Popup (mobile) ────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
    const overlay = document.querySelector('.modal-overlay[data-modal="auth-gate"]');
    const closeBtns = overlay ? overlay.querySelectorAll('[data-modal-close]') : [];

    // Show when clicking protected tabs (logged out)
    document.querySelectorAll('[data-auth-required]').forEach(el => {
        el.addEventListener('click', function (e) {
            if (!window.H2O?.isLoggedIn?.()) {
                e.preventDefault();
                if (overlay) overlay.classList.add('is-open');
            }
        });
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            if (overlay) overlay.classList.remove('is-open');
        });
    });

    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) overlay.classList.remove('is-open');
        });
    }
});

/* ── Active Nav Link ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;
    document.querySelectorAll('.navbar__nav a').forEach(link => {
        const href = link.getAttribute('href') || '';
        if (
            (href.includes('index') && (path === '/' || path.endsWith('index.html'))) ||
            (href.includes('stories') && path.includes('stories')) ||
            (href.includes('about') && path.includes('about'))
        ) {
            link.classList.add('active');
        }
    });
});

/* ── Utility: escapeHtml ──────────────────────────────────── */
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.escapeHtml = escapeHtml;