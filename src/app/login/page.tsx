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

            <p className="text-[10px] text-gbus-text-dim text-center mt-3 opacity-60">
              Hundred Core 계정 하나로 모든 HC 앱을 이용할 수 있습니다
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
