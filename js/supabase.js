/* ============================================================
   H2O WRITES — supabase.js
   Supabase client initialization
   ============================================================ */

const SUPABASE_URL  = 'https://tjhtmjhrgxaxhdkijhhu.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqaHRtamhyZ3hheGhka2lqaGh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMjI5MjYsImV4cCI6MjA5NTc5ODkyNn0.ZOFGzSIZuP0ONvBBhsUYaSUIMGyNm_jwHo4JE3gcPFo';

// Load Supabase from CDN
const _supabaseScript = document.createElement('script');
_supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
_supabaseScript.onload = () => {
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    window.dispatchEvent(new Event('supabase-ready'));
};
document.head.appendChild(_supabaseScript);