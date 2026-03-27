"use client";

import { useState, useEffect, useRef } from "react";
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
  const headerRef = useRef<HTMLElement>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isLoggedIn = user && profile?.verified;

  // 페이지 이동 시 메뉴 닫기
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // 메뉴 외부 클릭 시 닫기 (header 전체를 ref로 감싸서 드롭다운 포함)
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const navLinks = isLoggedIn
    ? [
        { href: "/dashboard", label: "대시보드", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4", show: true },
        { href: "/barrack", label: "배럭", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10", show: !!profile.barrack_verified },
        { href: "/notices", label: "공지", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", show: true },
        { href: "/income", label: "소득", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", show: true },
        { href: "/driver", label: "기사", icon: "M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10M13 16H3m10 0h2m0 0a1 1 0 011 1v0a1 1 0 001 1h2a1 1 0 001-1v-5a1 1 0 00-.293-.707l-3-3A1 1 0 0016.414 8H13", show: !!profile.driver_verified },
        { href: "/admin/users", label: "관리", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z", show: !!(profile.is_admin || profile.is_moderator), accent: true },
      ].filter((l) => l.show)
    : [];

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-40 glass border-b border-gbus-border/30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* 로고 */}
          <Link href={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2.5 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gbus-primary/15 border border-gbus-primary/25 flex items-center justify-center">
              <span className="text-xs font-black gradient-text">G</span>
            </div>
            <span className="text-lg font-bold gradient-text tracking-tight">G-BUS</span>
          </Link>

          {/* Desktop nav — 1024px 이상 */}
          <nav className="hidden lg:flex items-center gap-0.5">
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
                      pathname === link.href || (link.href !== "/dashboard" && pathname?.startsWith(link.href))
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

          {/* Mobile — 1024px 미만: 닉네임 + 햄버거 */}
          <div className="flex lg:hidden items-center gap-2">
            {loading ? (
              <div className="w-12 h-6 rounded shimmer" />
            ) : isLoggedIn ? (
              <>
                <Link href="/mypage" className="text-xs text-gbus-text-muted font-medium truncate max-w-[100px]">
                  {profile.game_nickname || profile.nickname}
                </Link>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="relative w-10 h-10 flex items-center justify-center rounded-xl border border-gbus-border/30 hover:bg-gbus-surface-light/40 transition-colors"
                  aria-label="메뉴"
                >
                  <div className="flex flex-col gap-[5px]">
                    <span className={`block w-5 h-[2px] bg-current rounded-full transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
                    <span className={`block w-5 h-[2px] bg-current rounded-full transition-all duration-300 ${menuOpen ? "opacity-0 scale-0" : ""}`} />
                    <span className={`block w-5 h-[2px] bg-current rounded-full transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
                  </div>
                </button>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm">로그인</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && isLoggedIn && (
          <div className="lg:hidden border-t border-gbus-border/30 glass">
            <div className="max-w-6xl mx-auto px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all duration-200 ${
                    pathname === link.href || (link.href !== "/dashboard" && pathname?.startsWith(link.href))
                      ? "text-gbus-text bg-gbus-primary/10 border border-gbus-primary/20"
                      : link.accent
                        ? "text-gbus-accent hover:bg-gbus-accent/5"
                        : "text-gbus-text-muted hover:text-gbus-text hover:bg-gbus-surface-light/40"
                  }`}
                >
                  <svg className="w-5 h-5 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                  </svg>
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 mt-2 border-t border-gbus-border/20 space-y-1">
                <Link
                  href="/mypage"
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gbus-text-muted hover:text-gbus-text hover:bg-gbus-surface-light/40 rounded-xl transition-all duration-200"
                >
                  <svg className="w-5 h-5 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  마이페이지
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-gbus-danger/70 hover:text-gbus-danger hover:bg-gbus-danger/5 rounded-xl transition-all duration-200"
                >
                  <svg className="w-5 h-5 shrink-0 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 모바일 하단 padding (하단 탭바 없으므로 불필요하지만 메뉴 열었을 때 콘텐츠 가림 방지) */}
    </>
  );
}
