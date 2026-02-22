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
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  const publicPaths = ["/", "/login", "/terms", "/privacy"];
  if (publicPaths.includes(pathname) || pathname.startsWith("/auth/") || pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  // 미로그인 → 로그인 페이지
  if (!user) {
    return redirectTo("/login");
  }

  // 유저 프로필 조회 (verified, is_admin)
  const { data: profile } = await supabase
    .from("users")
    .select("verified, is_admin, is_moderator")
    .eq("id", user.id)
    .single();

  // 프로필 완성 페이지는 항상 허용 (OAuth 유저용)
  if (pathname === "/complete-profile") {
    return supabaseResponse;
  }

  // 프로필 없으면 pending으로
  if (!profile) {
    if (pathname !== "/pending") {
      return redirectTo("/pending");
    }
    return supabaseResponse;
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
