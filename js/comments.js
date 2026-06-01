/* ============================================================
   H2O WRITES — comments.js
   Phase 3B | Comments system
   ============================================================ */

window.H2O = window.H2O || {};

function waitForSupabase() {
    return new Promise(resolve => {
        if (window.supabase && window.supabase.from) return resolve();
        window.addEventListener('supabase-ready', resolve, { once: true });
    });
}

/* ── Build a single comment element ─────────────────────── */
function buildComment(c, currentUserId, isAdmin) {
    const initial  = c.profiles?.display_name?.charAt(0).toUpperCase() || '?';
    const name     = c.profiles?.display_name || 'Deleted User';
    const handle   = c.profiles?.handle || '';
    const timeStr  = timeAgo(c.created_at);
    const bodyHTML = c.is_spoiler
        ? `<span class="spoiler-text" title="Click to reveal">${escapeHtml(c.body)}</span>`
        : escapeHtml(c.body);

    const canDelete = currentUserId && (currentUserId === c.user_id || isAdmin);

    return `
        <div class="comment" data-id="${c.id}">
            <div class="comment__avatar" style="background:${avatarColor(handle)};color:#0C0F13">${initial}</div>
            <div class="comment__body">
                <div class="comment__meta">
                    <span class="comment__name">${escapeHtml(name)}</span>
                    <span class="comment__time">${timeStr}</span>
                    ${c.is_spoiler ? '<span class="badge badge--warning" style="font-size:10px;padding:1px 6px">Spoiler</span>' : ''}
                </div>
                <div class="comment__text">${bodyHTML}</div>
                <div class="comment__actions">
                    <button class="comment__action-btn reply-btn" data-id="${c.id}" data-name="${escapeHtml(name)}">Reply</button>
                    ${canDelete ? `<button class="comment__action-btn comment__action-btn--delete delete-btn" data-id="${c.id}">Delete</button>` : ''}
                </div>
                <div class="comment__replies" id="replies-${c.id}"></div>
            </div>
        </div>
    `;
}

/* ── Build reply element ────────────────────────────────── */
function buildReply(c, currentUserId, isAdmin) {
    const initial = c.profiles?.display_name?.charAt(0).toUpperCase() || '?';
    const name    = c.profiles?.display_name || 'Deleted User';
    const handle  = c.profiles?.handle || '';
    const timeStr = timeAgo(c.created_at);
    const bodyHTML = c.is_spoiler
        ? `<span class="spoiler-text" title="Click to reveal">${escapeHtml(c.body)}</span>`
        : escapeHtml(c.body);
    const canDelete = currentUserId && (currentUserId === c.user_id || isAdmin);

    return `
        <div class="comment" data-id="${c.id}" style="padding:10px 0">
            <div class="comment__avatar" style="width:26px;height:26px;font-size:11px;background:${avatarColor(handle)};color:#0C0F13;flex-shrink:0">${initial}</div>
            <div class="comment__body">
                <div class="comment__meta">
                    <span class="comment__name">${escapeHtml(name)}</span>
                    <span class="comment__time">${timeStr}</span>
                </div>
                <div class="comment__text">${bodyHTML}</div>
                <div class="comment__actions">
                    ${canDelete ? `<button class="comment__action-btn comment__action-btn--delete delete-btn" data-id="${c.id}">Delete</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

/* ── Avatar color from handle ───────────────────────────── */
function avatarColor(handle) {
    const colors = ['#00C2D9','#2ECC9A','#E8A838','#9B59B6','#E05C5C','#3498DB'];
    let hash = 0;
    for (let i = 0; i < handle.length; i++) hash = handle.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

/* ── timeAgo ────────────────────────────────────────────── */
function timeAgo(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return Math.floor(diff / 60)   + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600)  + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Build comment input box ────────────────────────────── */
function buildCommentInput(placeholder, submitLabel, onSubmit) {
    const wrap = document.createElement('div');
    wrap.className = 'comment-input-wrap';
    wrap.innerHTML = `
        <textarea class="form-textarea" placeholder="${placeholder}" maxlength="1000" rows="3" style="resize:none"></textarea>
        <div class="comment-input-actions">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);cursor:pointer">
                <input type="checkbox" class="spoiler-check" style="accent-color:var(--accent)">
                Mark as spoiler
            </label>
            <button class="btn btn--primary btn--sm submit-comment-btn">${submitLabel}</button>
        </div>
        <div style="font-size:12px;color:var(--text-ghost);text-align:right;margin-top:4px" class="char-counter"></div>
    `;

    const textarea = wrap.querySelector('textarea');
    const counter  = wrap.querySelector('.char-counter');
    const btn      = wrap.querySelector('.submit-comment-btn');
    const spoiler  = wrap.querySelector('.spoiler-check');

    textarea.addEventListener('input', function () {
        const len = this.value.length;
        counter.textContent = `${len}/1000`;
        counter.style.color = len > 900 ? 'var(--color-warning)' : 'var(--text-ghost)';
    });

    btn.addEventListener('click', async function () {
        const body = textarea.value.trim();
        if (!body) return;
        btn.disabled = true;
        btn.textContent = 'Posting…';
        await onSubmit(body, spoiler.checked);
        textarea.value = '';
        counter.textContent = '';
        btn.disabled = false;
        btn.textContent = submitLabel;
    });

    return wrap;
}

/* ── Init comments for a page ───────────────────────────── */
async function initComments({ storyId, chapterId = null, toggleBtnId, bodyId, threadId, loginPromptId }) {
    await waitForSupabase();

    const toggleBtn  = document.getElementById(toggleBtnId);
    const bodyEl     = document.getElementById(bodyId);
    const threadEl   = document.getElementById(threadId);
    const loginPrompt = document.getElementById(loginPromptId);

    if (!toggleBtn || !bodyEl || !threadEl) return;

    // Toggle open/close
    toggleBtn.addEventListener('click', function () {
        const isOpen = bodyEl.classList.toggle('is-open');
        const chevron = this.querySelector('[id$="-chevron"], use');
        if (chevron) chevron.setAttribute('href', isOpen ? '#icon-chevron-up' : '#icon-chevron-down');
        if (isOpen) loadComments();
    });

    const { data: { session } } = await window.supabase.auth.getSession();
    const currentUser = session?.user || null;
    const isAdmin = window.H2O?.profile?.is_admin || false;

    // Show/hide login prompt
    if (loginPrompt) loginPrompt.style.display = currentUser ? 'none' : 'block';

    // Add comment input for logged in users
    if (currentUser) {
        const inputBox = buildCommentInput(
            'Leave a comment…',
            'Post',
            async (body, isSpoiler) => {
                await postComment(body, isSpoiler, null, currentUser.id, storyId, chapterId);
                loadComments();
            }
        );
        bodyEl.insertBefore(inputBox, threadEl);
    }

    async function loadComments() {
        threadEl.innerHTML = '<div style="padding:var(--gap-md);color:var(--text-ghost);font-size:13px">Loading…</div>';

        let query = window.supabase
            .from('comments')
            .select('*, profiles(display_name, handle)')
            .eq('story_id', storyId)
            .eq('is_deleted', false)
            .is('parent_id', null)
            .order('created_at', { ascending: true });

        if (chapterId) query = query.eq('chapter_id', chapterId);
        else query = query.is('chapter_id', null);

        const { data: comments } = await query;

        if (!comments || comments.length === 0) {
            threadEl.innerHTML = '<div class="empty-state" style="padding:var(--gap-lg) 0;font-size:13px">No comments yet. Be the first!</div>';
            return;
        }

        threadEl.innerHTML = comments.map(c => buildComment(c, currentUser?.id, isAdmin)).join('');

        // Load replies for each comment
        for (const c of comments) {
            const { data: replies } = await window.supabase
                .from('comments')
                .select('*, profiles(display_name, handle)')
                .eq('parent_id', c.id)
                .eq('is_deleted', false)
                .order('created_at', { ascending: true });

            const repliesEl = document.getElementById(`replies-${c.id}`);
            if (repliesEl && replies?.length) {
                repliesEl.innerHTML = replies.map(r => buildReply(r, currentUser?.id, isAdmin)).join('');
            }
        }

        // Bind events
        bindCommentEvents(threadEl, currentUser, storyId, chapterId, loadComments);
    }
}

/* ── Post a comment ─────────────────────────────────────── */
async function postComment(body, isSpoiler, parentId, userId, storyId, chapterId) {
    await waitForSupabase();
    const { error } = await window.supabase.from('comments').insert({
        user_id:    userId,
        story_id:   storyId,
        chapter_id: chapterId || null,
        parent_id:  parentId  || null,
        body,
        is_spoiler: isSpoiler,
    });
    if (error) console.error('postComment:', error);
}

/* ── Bind reply/delete/spoiler events ───────────────────── */
function bindCommentEvents(threadEl, currentUser, storyId, chapterId, reload) {
    // Spoiler reveal
    threadEl.querySelectorAll('.spoiler-text').forEach(el => {
        el.addEventListener('click', function () { this.classList.toggle('is-revealed'); });
    });

    // Reply buttons
    threadEl.querySelectorAll('.reply-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const commentId   = this.dataset.id;
            const commentName = this.dataset.name;
            const repliesEl   = document.getElementById(`replies-${commentId}`);
            if (!repliesEl || !currentUser) return;

            // Remove any existing reply box
            const existing = repliesEl.querySelector('.comment-input-wrap');
            if (existing) { existing.remove(); return; }

            const replyBox = buildCommentInput(
                `Replying to ${commentName}…`,
                'Reply',
                async (body, isSpoiler) => {
                    await postComment(body, isSpoiler, commentId, currentUser.id, storyId, chapterId);
                    reload();
                }
            );
            repliesEl.insertBefore(replyBox, repliesEl.firstChild);
            replyBox.querySelector('textarea').focus();
        });
    });

    // Delete buttons
    threadEl.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function () {
            if (!confirm('Delete this comment?')) return;
            const commentId = this.dataset.id;
            await waitForSupabase();
            await window.supabase.from('comments').update({ is_deleted: true }).eq('id', commentId);
            reload();
        });
    });
}

// Expose globally
window.H2O.initComments = initComments;