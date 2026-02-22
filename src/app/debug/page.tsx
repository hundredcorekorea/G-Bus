"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";

export default function DebugPage() {
  const auth = useAuth();
  const [info, setInfo] = useState<Record<string, unknown>>({ status: "loading..." });

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const result: Record<string, unknown> = {};

      // 1. document.cookie 분석
      const rawCookies = document.cookie;
      const cookies = rawCookies.split(";").map((c) => c.trim()).filter(Boolean);
      result.cookieCount = cookies.length;
      result.cookies = cookies.map((c) => {
        const eq = c.indexOf("=");
        const name = c.substring(0, eq);
        const val = c.substring(eq + 1);
        return {
          name,
          valueLength: val.length,
          valueStart: val.substring(0, 80),
          isBase64: val.startsWith("base64-"),
          isUrlEncoded: val.includes("%"),
        };
      });

      // 2. getSession (로컬 쿠키에서 읽기, 네트워크 없음)
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        result.getSession = {
          exists: !!session,
          expiresAt: session?.expires_at
            ? new Date(session.expires_at * 1000).toISOString()
            : null,
          userId: session?.user?.id?.substring(0, 8),
          email: session?.user?.email,
          error: error?.message ?? null,
        };
      } catch (e) {
        result.getSessionError = String(e);
      }

      // 3. getUser (서버 검증)
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        result.getUser = {
          exists: !!user,
          id: user?.id?.substring(0, 8),
          error: error?.message ?? null,
        };
      } catch (e) {
        result.getUserError = String(e);
      }

      // 4. localStorage supabase 키
      const lsKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.includes("supabase") || k?.includes("sb-")) {
          lsKeys.push(k);
        }
      }
      result.localStorageKeys = lsKeys;

      setInfo(result);
    })();
  }, []);

  return (
    <div style={{ background: "#111", color: "#eee", fontFamily: "monospace", padding: 20, minHeight: "100vh" }}>
      <h2>G-BUS Debug (Client Component)</h2>
      <h3>useAuth() 상태:</h3>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {JSON.stringify(
          {
            loading: auth.loading,
            hasUser: !!auth.user,
            userId: auth.user?.id?.substring(0, 8),
            email: auth.user?.email,
            hasProfile: !!auth.profile,
            verified: auth.profile?.verified,
            nickname: auth.profile?.game_nickname,
          },
          null,
          2
        )}
      </pre>
      <h3>세션 & 쿠키 상세:</h3>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  );
}
