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
  const [gameServer, setGameServer] = useState("");
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
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("users").insert({
        id: data.user.id,
        nickname: nickname.trim(),
        game_nickname: gameNickname.trim(),
        game_server: gameServer.trim() || null,
      });

      if (profileError) {
        setError("프로필 생성 실패: " + profileError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/pending");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") handleLogin();
    else handleSignup();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-3xl font-bold text-gbus-primary">G-BUS</span>
        </Link>

        <div className="bg-gbus-surface border border-gbus-border rounded-xl p-6">
          {/* 탭 */}
          <div className="flex mb-6 bg-gbus-bg rounded-lg p-1">
            <button
              type="button"
              className={`flex-1 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                mode === "login"
                  ? "bg-gbus-primary text-white"
                  : "text-gbus-text-muted hover:text-gbus-text"
              }`}
              onClick={() => { setMode("login"); setError(""); }}
            >
              로그인
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                mode === "signup"
                  ? "bg-gbus-primary text-white"
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
                <Input
                  label="인게임 서버 (선택)"
                  value={gameServer}
                  onChange={(e) => setGameServer(e.target.value)}
                  placeholder="예: 스카니아, 리부트 등"
                />
              </>
            )}

            {error && (
              <p className="text-sm text-gbus-danger bg-gbus-danger/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              {mode === "login" ? "로그인" : "회원가입"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
