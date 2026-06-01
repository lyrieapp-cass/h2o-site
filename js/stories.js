/* ============================================================
   H2O WRITES — stories.js
   Phase 2B | Supabase data layer — shared across pages
   ============================================================ */

window.H2O = window.H2O || {};

// ── Wait for Supabase ─────────────────────────────────────
function waitForSupabase() {
    return new Promise(resolve => {
        if (window.supabase && window.supabase.from) return resolve();
        window.addEventListener('supabase-ready', resolve, { once: true });
    });
}

// ── Fetch all visible stories ─────────────────────────────
async function fetchStories() {
    await waitForSupabase();
    const { data, error } = await window.supabase
        .from('stories')
        .select('id, slug, title, cover_url, status, genre, warnings, views, updated_at')
        .eq('visible', true)
        .order('updated_at', { ascending: false });
    if (error) { console.error('fetchStories:', error); return []; }
    return data || [];
}

// ── Fetch single story by slug ────────────────────────────
async function fetchStory(slug) {
    await waitForSupabase();
    const { data, error } = await window.supabase
        .from('stories')
        .select('*')
        .eq('slug', slug)
        .eq('visible', true)
        .single();
    if (error) { console.error('fetchStory:', error); return null; }
    return data;
}

// ── Fetch chapters for a story ────────────────────────────
async function fetchChapters(storyId) {
    await waitForSupabase();
    const { data, error } = await window.supabase
        .from('chapters')
        .select('id, num, title, published_at, published')
        .eq('story_id', storyId)
        .eq('published', true)
        .order('num', { ascending: true });
    if (error) { console.error('fetchChapters:', error); return []; }
    return data || [];
}

// ── Fetch single chapter ──────────────────────────────────
async function fetchChapter(storyId, num) {
    await waitForSupabase();
    const { data, error } = await window.supabase
        .from('chapters')
        .select('*')
        .eq('story_id', storyId)
        .eq('num', num)
        .eq('published', true)
        .single();
    if (error) { console.error('fetchChapter:', error); return null; }
    return data;
}

// ── Fetch heart count for a story ────────────────────────
async function fetchHeartCount(storyId) {
    await waitForSupabase();
    const { count } = await window.supabase
        .from('hearts')
        .select('id', { count: 'exact', head: true })
        .eq('story_id', storyId);
    return count || 0;
}

// ── Increment view count ──────────────────────────────────
async function incrementViews(storyId) {
    await waitForSupabase();
    await window.supabase.rpc('increment_views', { story_id: storyId });
}

// ── Utilities ─────────────────────────────────────────────
function timeAgo(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60)     return 'just now';
    if (diff < 3600)   return Math.floor(diff / 60)   + 'm ago';
    if (diff < 86400)  return Math.floor(diff / 3600)  + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isNewUpdate(dateStr) {
    return (new Date() - new Date(dateStr)) / 86400000 <= 7;
}

function buildStoryCard(story, rank) {
    const isNew       = isNewUpdate(story.updated_at);
    const statusClass = story.status === 'completed' ? 'badge--status-completed' : 'badge--status-ongoing';
    const statusLabel = story.status === 'completed' ? 'Completed' : 'Ongoing';

    let rankBadge = '';
    if (rank === 1) rankBadge = `<span class="badge badge--rank badge--rank-1" style="position:absolute;top:8px;left:8px">#1</span>`;
    else if (rank === 2) rankBadge = `<span class="badge badge--rank badge--rank-2" style="position:absolute;top:8px;left:8px">#2</span>`;
    else if (rank === 3) rankBadge = `<span class="badge badge--rank badge--rank-3" style="position:absolute;top:8px;left:8px">#3</span>`;

    const coverContent = story.cover_url
        ? `<img src="${story.cover_url}" alt="${escapeHtml(story.title)}" loading="lazy">`
        : `<div class="cover-title">${escapeHtml(story.title)}</div>`;
    const coverClass = story.cover_url ? '' : ' is-placeholder';

    const latestChapter = story.latest_chapter_num || '—';

    return `
        <a class="story-card" href="story.html?slug=${story.slug}">
            <div class="story-card__cover-wrap${coverClass}">
                ${coverContent}
                ${rankBadge}
                <span class="badge ${statusClass} story-card__badge-bl">${statusLabel}</span>
                <button class="quick-bookmark-btn story-card__badge-tr" aria-label="Bookmark"
                    onclick="event.preventDefault();event.stopPropagation();handleBookmark('${story.id}',this)">
                    <svg viewBox="0 0 24 24"><use href="#icon-bookmark"/></svg>
                </button>
                ${isNew ? '<span class="badge badge--new" style="position:absolute;top:8px;right:36px">NEW</span>' : ''}
            </div>
            <div class="story-card__meta">
                <div class="story-card__chapter">
                    ${latestChapter !== '—' ? `Ch.${String(latestChapter).padStart(2,'0')}` : 'No chapters yet'}
                    <span style="margin-left:auto;font-weight:400;font-size:11px;color:var(--text-ghost)">${timeAgo(story.updated_at)}</span>
                </div>
                <div class="story-card__title">${escapeHtml(story.title)}</div>
            </div>
        </a>
    `;
}

// ── Bookmark handler (quick bookmark on cards) ────────────
async function handleBookmark(storyId, btn) {
    if (!window.H2O?.isLoggedIn?.()) {
        const modal = document.getElementById('auth-gate-modal');
        if (modal) modal.classList.add('is-open');
        return;
    }
    await waitForSupabase();
    const userId = window.H2O.user.id;
    const isBookmarked = btn.classList.contains('is-bookmarked');

    if (isBookmarked) {
        await window.supabase.from('bookmarks').delete()
            .eq('user_id', userId).eq('story_id', storyId);
        btn.classList.remove('is-bookmarked');
    } else {
        await window.supabase.from('bookmarks').insert({ user_id: userId, story_id: storyId });
        btn.classList.add('is-bookmarked');
    }
}

// Expose globally
window.H2O.fetchStories     = fetchStories;
window.H2O.fetchStory       = fetchStory;
window.H2O.fetchChapters    = fetchChapters;
window.H2O.fetchChapter     = fetchChapter;
window.H2O.fetchHeartCount  = fetchHeartCount;
window.H2O.incrementViews   = incrementViews;
window.H2O.buildStoryCard   = buildStoryCard;
window.H2O.timeAgo          = timeAgo;
window.H2O.isNewUpdate      = isNewUpdate;
window.handleBookmark       = handleBookmark;