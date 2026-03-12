"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 hero-bg">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gbus-primary/10 border border-gbus-primary/20 mb-4">
            <span className="text-2xl font-black gradient-text">G</span>
          </div>
          <div className="text-2xl font-black gradient-text">G-BUS</div>
          <div className="text-xs text-gbus-text-dim mt-1.5 tracking-wide">새 비밀번호 설정</div>
        </div>

        <div className="glass rounded-2xl p-6">
          {done ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4 opacity-30">&#x2705;</div>
              <h2 className="text-lg font-bold mb-2">비밀번호 변경 완료</h2>
              <p className="text-sm text-gbus-text-muted mb-6">
                새 비밀번호로 로그인할 수 있습니다.
              </p>
              <Button size="lg" className="w-full btn-shine" onClick={() => router.push("/dashboard")}>
                대시보드로 이동
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gbus-text-muted mb-5">
                새 비밀번호를 입력해 주세요.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="새 비밀번호"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8자 이상"
                  minLength={8}
                  required
                />
                <Input
                  label="비밀번호 확인"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="비밀번호 재입력"
                  minLength={8}
                  required
                />

                {error && (
                  <p className="text-sm text-gbus-danger bg-gbus-danger/10 px-4 py-2.5 rounded-xl border border-gbus-danger/20">
                    {error}
                  </p>
                )}

                <Button type="submit" loading={loading} size="lg" className="w-full btn-shine">
                  비밀번호 변경
                </Button>
              </form>

              <div className="mt-4 text-center">
                <Link href="/login" className="text-xs text-gbus-text-dim hover:text-gbus-primary-light transition-colors">
                  로그인으로 돌아가기
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
