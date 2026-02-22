import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/pending";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim(),
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim(),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server Component에서 호출 시 무시
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // OAuth 유저의 users 프로필 존재 여부 확인
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("id, game_nickname")
          .eq("id", user.id)
          .single();

        // 프로필은 트리거로 자동 생성되지만 game_nickname이 비어있으면
        // 프로필 완성 페이지로 보냄
        if (!profile || !profile.game_nickname) {
          return NextResponse.redirect(`${origin}/complete-profile`);
        }

        // 이미 프로필 완성된 유저는 대시보드로
        return NextResponse.redirect(`${origin}/dashboard`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 에러 시 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
