import { NextResponse } from "next/server";

// 클라이언트 사이드 디버그용 HTML 페이지 제공
export async function GET() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  const html = `<!DOCTYPE html>
<html><head><title>G-BUS Client Debug</title></head>
<body style="background:#111;color:#eee;font-family:monospace;padding:20px;white-space:pre-wrap;word-break:break-all">
<h2>G-BUS Client-Side Debug</h2>
<pre id="out">Loading...</pre>
<script type="module">
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = '${url}';
const key = '${key}';
const out = document.getElementById('out');

async function run() {
  const result = {};

  // 1. 모든 쿠키 이름 + 값 길이
  const cookies = document.cookie.split(';').map(c => c.trim()).filter(Boolean);
  result.cookieCount = cookies.length;
  result.cookies = cookies.map(c => {
    const [name, ...rest] = c.split('=');
    const val = rest.join('=');
    return { name, valueLength: val.length, valueStart: val.substring(0, 50) + '...' };
  });

  // 2. Supabase 세션 (supabase-js standalone - localStorage 기반)
  try {
    const sb = createClient(url, key);
    const { data: { session }, error: sessErr } = await sb.auth.getSession();
    result.standaloneSession = {
      exists: !!session,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
      userId: session?.user?.id?.substring(0, 8),
      error: sessErr?.message ?? null,
    };
  } catch (e) {
    result.standaloneError = String(e);
  }

  // 3. localStorage 확인
  const lsKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.includes('supabase')) {
      lsKeys.push({ key: k, valueLength: (localStorage.getItem(k) || '').length });
    }
  }
  result.localStorage = lsKeys;

  // 4. 환경변수 확인
  result.config = { url: url.substring(0, 35) + '...', keyLength: key.length };

  out.textContent = JSON.stringify(result, null, 2);
}
run();
</script>
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
  });
}
