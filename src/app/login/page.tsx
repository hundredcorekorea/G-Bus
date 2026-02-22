"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

type Mode = "login" | "signup";
type AgreementKey = "terms" | "privacy";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [gameNickname, setGameNickname] = useState("");
  const [agreed, setAgreed] = useState<Record<AgreementKey, boolean>>({ terms: false, privacy: false });
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  const allAgreed = agreed.terms && agreed.privacy;

  const toggleAll = (checked: boolean) => {
    setAgreed({ terms: checked, privacy: checked });
  };

  const handleSignup = async () => {
    if (!nickname.trim() || !gameNickname.trim()) {
      setError("닉네임과 인게임 닉네임은 필수입니다.");
      return;
    }
    if (!allAgreed) {
      setError("이용약관과 개인정보처리방침에 모두 동의해야 합니다.");
      return;
    }
    setLoading(true);
    setError("");

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: nickname.trim(),
          game_nickname: gameNickname.trim(),
        },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    // DB 트리거가 users + hc_app_registrations 자동 생성
    router.push("/pending");
  };

  const handleOAuth = async (provider: "google" | "discord") => {
    setOauthLoading(provider);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") handleLogin();
    else handleSignup();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 hero-bg">
      <div className="w-full max-w-md animate-fade-up">
        {/* 헤더 */}
        <Link href="/" className="block text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gbus-primary/10 border border-gbus-primary/20 mb-4 animate-pulse-glow">
            <span className="text-2xl font-black gradient-text">G</span>
          </div>
          <div className="text-2xl font-black gradient-text">G-BUS</div>
          <div className="text-xs text-gbus-text-dim mt-1.5 tracking-wide">
            Hundred Core 계정으로 로그인
          </div>
        </Link>

        <div className="glass rounded-2xl p-6">
          {/* 탭 */}
          <div className="flex mb-6 bg-gbus-bg/60 rounded-xl p-1">
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm rounded-xl font-semibold transition-all duration-300 cursor-pointer ${
                mode === "login"
                  ? "bg-gradient-to-r from-gbus-primary to-gbus-primary-dim text-white shadow-[0_2px_12px_rgba(108,92,231,0.3)]"
                  : "text-gbus-text-muted hover:text-gbus-text"
              }`}
              onClick={() => { setMode("login"); setError(""); }}
            >
              로그인
            </button>
            <button
              type="button"
              className={`flex-1 py-2.5 text-sm rounded-xl font-semibold transition-all duration-300 cursor-pointer ${
                mode === "signup"
                  ? "bg-gradient-to-r from-gbus-primary to-gbus-primary-dim text-white shadow-[0_2px_12px_rgba(108,92,231,0.3)]"
                  : "text-gbus-text-muted hover:text-gbus-text"
              }`}
              onClick={() => { setMode("signup"); setError(""); }}
            >
              회원가입
            </button>
          </div>

          {/* HC 통합 회원가입 안내 */}
          {mode === "signup" && (
            <div className="mb-6 text-center">
              <p className="text-lg font-bold text-white">Hundred Core에 오신 것을 환영합니다</p>
              <p className="text-xs text-gbus-text-muted mt-1.5">
                통합 계정 하나로 G-BUS를 포함한 모든 HC 앱을 이용할 수 있습니다
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="이메일"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상"
              minLength={8}
              required
            />

            {mode === "signup" && (
              <>
                <Input
                  label="닉네임"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="G-BUS에서 사용할 닉네임"
                  required
                />
                <Input
                  label="인게임 대표 닉네임"
                  value={gameNickname}
                  onChange={(e) => setGameNickname(e.target.value)}
                  placeholder="게임 내 캐릭터 닉네임"
                  required
                />

                {/* 약관 동의 */}
                <div className="bg-gbus-bg/40 rounded-xl p-4 border border-gbus-border/20 space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={allAgreed}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gbus-border/40 accent-gbus-primary cursor-pointer"
                    />
                    <span className="text-sm font-bold group-hover:text-gbus-primary-light transition-colors">전체 동의</span>
                  </label>

                  <div className="border-t border-gbus-border/20 pt-3 space-y-2.5">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreed.terms}
                        onChange={(e) => setAgreed((prev) => ({ ...prev, terms: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded border-gbus-border/40 accent-gbus-primary cursor-pointer"
                      />
                      <span className="text-xs text-gbus-text-muted">[필수] 이용약관 동의</span>
                      <Link href="/terms" target="_blank" className="ml-auto text-[10px] text-gbus-primary hover:text-gbus-primary-light underline underline-offset-2">보기</Link>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreed.privacy}
                        onChange={(e) => setAgreed((prev) => ({ ...prev, privacy: e.target.checked }))}
                        className="w-3.5 h-3.5 rounded border-gbus-border/40 accent-gbus-primary cursor-pointer"
                      />
                      <span className="text-xs text-gbus-text-muted">[필수] 개인정보처리방침 동의</span>
                      <Link href="/privacy" target="_blank" className="ml-auto text-[10px] text-gbus-primary hover:text-gbus-primary-light underline underline-offset-2">보기</Link>
                    </label>
                  </div>
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-gbus-danger bg-gbus-danger/10 px-4 py-2.5 rounded-xl border border-gbus-danger/20">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full mt-2 btn-shine">
              {mode === "login" ? "로그인" : "회원가입"}
            </Button>
          </form>

          {/* 소셜 로그인 구분선 */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gbus-border/30" />
            <span className="text-[11px] text-gbus-text-dim">또는 간편 로그인</span>
            <div className="flex-1 h-px bg-gbus-border/30" />
          </div>

          {/* HC 통합 안내 */}
          <div className="mb-3 px-3 py-2.5 rounded-xl bg-gbus-primary/5 border border-gbus-primary/10">
            <p className="text-[11px] text-gbus-text-muted text-center leading-relaxed">
              Google/Discord로 가입하면 <span className="text-gbus-primary-light font-semibold">Hundred Core 통합 계정</span>이 자동 생성됩니다.
              <br />냥퀘스트, 젤리포켓 등 모든 HC 앱에서 동일 계정을 사용할 수 있습니다.
            </p>
          </div>

          {/* 소셜 로그인 버튼 */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {oauthLoading === "google" ? "연결 중..." : "Google로 계속하기"}
            </button>

            <button
              type="button"
              onClick={() => handleOAuth("discord")}
              disabled={oauthLoading !== null}
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
              </svg>
              {oauthLoading === "discord" ? "연결 중..." : "Discord로 계속하기"}
            </button>
          </div>

          <p className="text-[10px] text-gbus-text-dim text-center mt-4 opacity-60">
            Hundred Core 계정 하나로 모든 HC 앱을 이용할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
