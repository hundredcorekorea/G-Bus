import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. 환경변수 체크
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "MISSING";
  results.envCheck = {
    url: url.substring(0, 30) + "...",
    keyPrefix: key.substring(0, 20) + "...",
    keyLength: key.length,
  };

  // 2. Supabase 연결 테스트
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    });

    // Auth 세션 체크
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    results.auth = {
      hasUser: !!user,
      userId: user?.id?.substring(0, 8) + "...",
      email: user?.email,
      error: authError?.message ?? null,
    };

    // DB 쿼리 테스트
    const { data: usersCount, error: usersError } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true });
    results.dbUsers = {
      count: usersCount,
      error: usersError?.message ?? null,
    };

    const { data: sessions, error: sessionsError } = await supabase
      .from("bus_sessions")
      .select("id")
      .limit(1);
    results.dbSessions = {
      count: sessions?.length ?? 0,
      error: sessionsError?.message ?? null,
    };

    // hc_profiles 체크
    const { data: hcProfiles, error: hcError } = await supabase
      .from("hc_profiles")
      .select("id")
      .limit(5);
    results.hcProfiles = {
      count: hcProfiles?.length ?? 0,
      error: hcError?.message ?? null,
    };

    // 쿠키 확인
    const allCookies = cookieStore.getAll();
    results.cookies = allCookies.map(c => ({
      name: c.name,
      valueLength: c.value.length,
    }));

  } catch (err) {
    results.error = String(err);
  }

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
