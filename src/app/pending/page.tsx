"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { DISCORD_INVITE_URL } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PendingPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleRefresh = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("verified")
        .eq("id", user.id)
        .single();
      if (data?.verified) {
        router.push("/dashboard");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-gbus-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 hero-bg">
      <div className="w-full max-w-md text-center animate-fade-up">
        <Link href="/" className="block mb-10">
          <span className="text-3xl font-black gradient-text">G-BUS</span>
        </Link>

        <div className="glass rounded-2xl p-8">
          {/* 아이콘 */}
          <div className="w-20 h-20 rounded-2xl bg-gbus-warning/10 border border-gbus-warning/20 flex items-center justify-center mx-auto mb-5 animate-float">
            <span className="text-4xl">&#x23F3;</span>
          </div>

          <h2 className="text-xl font-bold mb-2">디스코드 인증이 필요합니다</h2>
          <p className="text-sm text-gbus-text-muted mb-6">아래 절차를 따라 인증을 완료해 주세요</p>

          {/* 프로필 정보 */}
          {profile && (
            <div className="bg-gbus-bg/40 rounded-xl p-4 mb-6 text-left border border-gbus-border/20">
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-gbus-text-dim">닉네임</span>
                <span className="font-medium">{profile.nickname}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gbus-text-dim">인게임</span>
                <span className="font-medium text-gbus-accent">{profile.game_nickname}</span>
              </div>
            </div>
          )}

          {/* 인증 절차 */}
          <div className="text-left mb-6 space-y-3">
            {[
              { num: "1", text: <>디스코드 서버에 참여</>, sub: null },
              {
                num: "2",
                text: <><strong className="text-gbus-text">#인증</strong> 채널에 테이머 정보창 스크린샷 업로드</>,
                sub: (
                  <span className="text-xs text-gbus-text-dim">
                    게임 내{" "}
                    <kbd className="px-1.5 py-0.5 bg-gbus-surface-light border border-gbus-border/40 rounded-md text-[10px] font-mono text-gbus-primary-light">C</kbd>{" "}
                    키 → 스크린샷
                  </span>
                ),
              },
              { num: "3", text: <>관리자 확인 후 <strong className="text-gbus-accent">승인 완료</strong></>, sub: null },
            ].map((step, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-gbus-primary/15 border border-gbus-primary/25 flex items-center justify-center text-xs font-bold text-gbus-primary-light shrink-0 mt-0.5">
                  {step.num}
                </div>
                <div className="text-sm text-gbus-text-muted">
                  {step.text}
                  {step.sub && <div className="mt-1">{step.sub}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Discord CTA */}
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-xl transition-all duration-200 w-full mb-3 shadow-[0_4px_20px_rgba(88,101,242,0.35)] hover:shadow-[0_6px_28px_rgba(88,101,242,0.5)] btn-shine"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            디스코드 서버 참여하기
          </a>

          <Button variant="secondary" size="md" className="w-full mb-3" onClick={handleRefresh}>
            승인 상태 확인
          </Button>

          <button onClick={handleLogout} className="text-xs text-gbus-text-dim hover:text-gbus-text-muted transition-colors cursor-pointer">
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
