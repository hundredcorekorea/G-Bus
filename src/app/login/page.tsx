"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [gameNickname, setGameNickname] = useState("");
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

  const handleSignup = async () => {
    if (!nickname.trim() || !gameNickname.trim()) {
      setError("닉네임과 인게임 닉네임은 필수입니다.");
      return;
    }
    setLoading(true);
    setError("");

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: nickname.trim() },
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // G-Bus 앱 전용 프로필 생성
      const { error: profileError } = await supabase.from("users").insert({
        id: data.user.id,
        nickname: nickname.trim(),
        game_nickname: gameNickname.trim(),
        hc_account_id: data.user.id,
      });

      if (profileError) {
        setError("프로필 생성 실패: " + profileError.message);
        setLoading(false);
        return;
      }

      // Hundred Core 앱 등록 (실패해도 가입은 진행)
      try {
        await supabase.from("hc_app_registrations").insert({
          user_id: data.user.id,
          app_id: "gbus",
        });
      } catch { /* 무시 */ }
    }

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
              placeholder="6자 이상"
              minLength={6}
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

                {/* 인증 안내 */}
                <div className="bg-gbus-bg/40 rounded-xl p-4 border border-gbus-border/20">
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-gbus-accent rounded-full" />
                    가입 후 디스코드 인증
                  </h4>

                  <ol className="text-xs text-gbus-text-muted space-y-2.5 list-decimal list-inside mb-4">
                    <li>
                      게임에서{" "}
                      <kbd className="px-1.5 py-0.5 bg-gbus-surface-light border border-gbus-border/40 rounded-md text-[10px] font-mono text-gbus-primary-light">C</kbd>{" "}
                      키 → <strong className="text-gbus-text">테이머 정보창</strong> 스크린샷
                    </li>
                    <li>
                      <strong className="text-[#5865F2]">디스코드 #인증</strong> 채널에 업로드
                    </li>
                    <li>
                      관리자 확인 후 <strong className="text-gbus-accent">승인 완료</strong>
                    </li>
                  </ol>

                  <div className="border border-gbus-border/30 rounded-xl overflow-hidden">
                    <div className="bg-gbus-surface/40 px-3 py-1.5 text-[10px] text-gbus-text-dim border-b border-gbus-border/30 font-medium">
                      예시) 테이머 정보창
                    </div>
                    <img
                      src="/example-tamer-info.png"
                      alt="테이머 정보창 예시"
                      className="w-full max-h-48 object-contain bg-gbus-bg"
                    />
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
