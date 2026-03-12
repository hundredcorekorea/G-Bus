"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export function Header() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isLoggedIn = user && profile?.verified;

  const navLinks = isLoggedIn
    ? [
        { href: "/dashboard", label: "대시보드", show: true },
        { href: "/barrack", label: "배럭", show: !!profile.barrack_verified },
        { href: "/notices", label: "공지", show: true },
        { href: "/income", label: "소득", show: true },
        { href: "/driver", label: "기사", show: !!profile.driver_verified },
        { href: "/admin/users", label: "관리", show: !!(profile.is_admin || profile.is_moderator), accent: true },
      ].filter((l) => l.show)
    : [];

  return (
    <header className="sticky top-0 z-40 glass border-b border-gbus-border/30">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2.5 group shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gbus-primary/15 border border-gbus-primary/25 flex items-center justify-center">
            <span className="text-xs font-black gradient-text">G</span>
          </div>
          <span className="text-lg font-bold gradient-text tracking-tight">G-BUS</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-16 h-6 rounded shimmer" />
              <div className="w-12 h-6 rounded shimmer" />
            </div>
          ) : isLoggedIn ? (
            <>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 ${
                    pathname === link.href
                      ? "text-gbus-text bg-gbus-surface-light/60"
                      : link.accent
                        ? "text-gbus-accent hover:text-gbus-accent-light hover:bg-gbus-accent/5"
                        : "text-gbus-text-muted hover:text-gbus-text hover:bg-gbus-surface-light/40"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center gap-2.5 ml-3 pl-3 border-l border-gbus-border/30">
                <Link href="/mypage" className="text-xs text-gbus-text-dim flex items-center gap-1.5 hover:text-gbus-primary-light transition-colors">
                  <span className="font-medium text-gbus-text-muted">{profile.game_nickname || profile.nickname}</span>
                  {profile.barrack_verified && (
                    <span className="status-dot status-dot-live" title="배럭 인증" />
                  )}
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  로그아웃
                </Button>
              </div>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">로그인</Button>
            </Link>
          )}
        </nav>

        {/* Mobile: user info + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {loading ? (
            <div className="w-12 h-6 rounded shimmer" />
          ) : isLoggedIn ? (
            <>
              <Link href="/mypage" className="text-xs text-gbus-text-muted font-medium truncate max-w-[100px]">
                {profile.game_nickname || profile.nickname}
              </Link>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gbus-surface-light/40 transition-colors"
                aria-label="메뉴"
              >
                {menuOpen ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="5" y1="5" x2="15" y2="15" />
                    <line x1="15" y1="5" x2="5" y2="15" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="3" y1="6" x2="17" y2="6" />
                    <line x1="3" y1="10" x2="17" y2="10" />
                    <line x1="3" y1="14" x2="17" y2="14" />
                  </svg>
                )}
              </button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">로그인</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && isLoggedIn && (
        <div className="md:hidden border-t border-gbus-border/30 bg-gbus-surface/95 backdrop-blur-xl animate-fade-up">
          <div className="max-w-6xl mx-auto px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 text-sm rounded-xl transition-all duration-200 ${
                  pathname === link.href
                    ? "text-gbus-text bg-gbus-surface-light/60"
                    : link.accent
                      ? "text-gbus-accent hover:bg-gbus-accent/5"
                      : "text-gbus-text-muted hover:text-gbus-text hover:bg-gbus-surface-light/40"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gbus-border/20">
              <Link
                href="/mypage"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm text-gbus-text-muted hover:text-gbus-text hover:bg-gbus-surface-light/40 rounded-xl transition-all duration-200"
              >
                마이페이지
              </Link>
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gbus-danger/70 hover:text-gbus-danger hover:bg-gbus-danger/5 rounded-xl transition-all duration-200"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
