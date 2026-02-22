import { NextResponse } from "next/server";

// 클라이언트 사이드 디버그용 HTML 페이지 제공
export async function GET() {
  const html = `<!DOCTYPE html>
<html><head><title>G-BUS Client Debug</title></head>
<body style="background:#111;color:#eee;font-family:monospace;padding:20px">
<h2>G-BUS Client-Side Debug</h2>
<pre id="out">Loading...</pre>
<script src="https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script>
const url = '${(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim()}';
const key = '${(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim()}';
const out = document.getElementById('out');

async function run() {
  const result = {};

  // 1. document.cookie 확인
  const cookies = document.cookie.split(';').map(c => c.trim()).filter(Boolean);
  result.cookieCount = cookies.length;
  result.cookieNames = cookies.map(c => c.split('=')[0]);

  // 2. Supabase 세션
  try {
    const sb = supabase.createClient(url, key);
    const { data: { session }, error: sessErr } = await sb.auth.getSession();
    result.session = {
      exists: !!session,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      userId: session?.user?.id?.substring(0, 8),
      email: session?.user?.email,
      error: sessErr?.message ?? null,
    };

    const { data: { user }, error: userErr } = await sb.auth.getUser();
    result.getUser = {
      exists: !!user,
      id: user?.id?.substring(0, 8),
      error: userErr?.message ?? null,
    };
  } catch (e) {
    result.supabaseError = String(e);
  }

  out.textContent = JSON.stringify(result, null, 2);
}
run();
</script>
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
  });
}
