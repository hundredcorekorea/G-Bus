import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co").trim();
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key").trim();

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            httpOnly: false, // 클라이언트 JS에서 document.cookie로 읽을 수 있어야 함
          })
        );
      },
    },
  });

  // getSession()은 네트워크 호출 없이 쿠키의 JWT만 확인 (빠르고 안정적)
  // getUser()는 매번 Supabase Auth API를 호출하여 타임아웃/레이트리밋 시 세션 끊김 발생
  // 실제 데이터 보안은 Supabase RLS가 처리하므로 미들웨어는 getSession()으로 충분
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const pathname = request.nextUrl.pathname;

  // 리다이렉트 시 Supabase 세션 쿠키를 보존하는 헬퍼
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      redirectResponse.cookies.set(name, value, options);
    });
    return redirectResponse;
  };

  // 로그인된 유저가 랜딩/로그인 페이지 접근 → 대시보드로
  if (user && (pathname === "/" || pathname === "/login")) {
    return redirectTo("/dashboard");
  }

  // 공개 경로
  const publicPaths = ["/", "/login", "/terms", "/privacy", "/debug", "/forgot-password", "/reset-password"];
  if (publicPaths.includes(pathname) || pathname.startsWith("/auth/") || pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  // 미로그인 → 로그인 페이지
  if (!user) {
    return redirectTo("/login");
  }

  // 유저 프로필 조회
  const { data: profile } = await supabase
    .from("users")
    .select("verified, is_admin, is_moderator, game_nickname")
    .eq("id", user.id)
    .single();

  // 프로필 완성 페이지는 항상 허용 (OAuth 유저용)
  if (pathname === "/complete-profile") {
    return supabaseResponse;
  }

  // 프로필 없거나 game_nickname 미입력 → complete-profile로
  // (OAuth 가입 후 프로필 미완성 상태)
  if (!profile || !profile.game_nickname) {
    if (pathname === "/pending") {
      return supabaseResponse;
    }
    return redirectTo("/complete-profile");
  }

  // 미승인 유저 → pending (pending 페이지는 허용)
  if (!profile.verified && pathname !== "/pending") {
    return redirectTo("/pending");
  }

  // 승인된 유저가 pending 접근 → 대시보드
  if (profile.verified && pathname === "/pending") {
    return redirectTo("/dashboard");
  }

  // 관리자 경로 체크
  if (pathname.startsWith("/admin") && !profile.is_admin && !profile.is_moderator) {
    return redirectTo("/dashboard");
  }

  return supabaseResponse;
}
