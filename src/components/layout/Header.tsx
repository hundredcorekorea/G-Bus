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
    <header className="sticky top-0 z-40 glass border-b border-gbus-border/30">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={profile?.verified ? "/dashboard" : "/"} className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-gbus-primary/15 border border-gbus-primary/25 flex items-center justify-center">
            <span className="text-xs font-black gradient-text">G</span>
          </div>
          <span className="text-lg font-bold gradient-text tracking-tight">G-BUS</span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {user && profile?.verified && (
            <>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 text-sm text-gbus-text-muted hover:text-gbus-text hover:bg-gbus-surface-light/40 rounded-lg transition-all duration-200"
              >
                대시보드
              </Link>
              <Link
                href="/barrack"
                className="px-3 py-1.5 text-sm text-gbus-text-muted hover:text-gbus-text hover:bg-gbus-surface-light/40 rounded-lg transition-all duration-200"
              >
                배럭
              </Link>
              {(profile.is_admin || profile.is_moderator) && (
                <Link
                  href="/admin/users"
                  className="px-3 py-1.5 text-sm text-gbus-accent hover:text-gbus-accent-light hover:bg-gbus-accent/5 rounded-lg transition-all duration-200"
                >
                  관리
                </Link>
              )}
            </>
          )}

          {user ? (
            <div className="flex items-center gap-2.5 ml-3 pl-3 border-l border-gbus-border/30">
              <span className="text-xs text-gbus-text-dim flex items-center gap-1.5">
                <span className="font-medium text-gbus-text-muted">{profile?.game_nickname || profile?.nickname}</span>
                {profile?.barrack_verified && (
                  <span className="status-dot status-dot-live" title="배럭 인증" />
                )}
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
