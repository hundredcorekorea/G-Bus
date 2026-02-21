"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export function Header() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 bg-gbus-bg/80 backdrop-blur-md border-b border-gbus-border">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={profile?.verified ? "/dashboard" : "/"} className="flex items-center gap-2">
          <span className="text-xl font-bold text-gbus-primary">G-BUS</span>
        </Link>

        <nav className="flex items-center gap-3">
          {user && profile?.verified && (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-gbus-text-muted hover:text-gbus-text transition-colors"
              >
                대시보드
              </Link>
              <Link
                href="/barrack"
                className="text-sm text-gbus-text-muted hover:text-gbus-text transition-colors"
              >
                배럭
              </Link>
              {(profile.is_admin || profile.is_moderator) && (
                <Link
                  href="/admin/users"
                  className="text-sm text-gbus-accent hover:text-gbus-accent-light transition-colors"
                >
                  관리
                </Link>
              )}
            </>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gbus-text-dim">
                {profile?.game_nickname || profile?.nickname}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                로그아웃
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm">로그인</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
