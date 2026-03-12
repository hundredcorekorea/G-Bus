"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback/reset`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 hero-bg">
      <div className="w-full max-w-md animate-fade-up">
        <Link href="/login" className="block text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gbus-primary/10 border border-gbus-primary/20 mb-4">
            <span className="text-2xl font-black gradient-text">G</span>
          </div>
          <div className="text-2xl font-black gradient-text">G-BUS</div>
          <div className="text-xs text-gbus-text-dim mt-1.5 tracking-wide">비밀번호 재설정</div>
        </Link>

        <div className="glass rounded-2xl p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4 opacity-30">&#x2709;</div>
              <h2 className="text-lg font-bold mb-2">이메일을 확인해 주세요</h2>
              <p className="text-sm text-gbus-text-muted mb-6">
                <span className="text-gbus-primary-light font-medium">{email}</span>로 비밀번호 재설정 링크를 보냈습니다.
                <br />메일함을 확인해 주세요.
              </p>
              <Link href="/login">
                <Button variant="secondary" size="lg" className="w-full">로그인으로 돌아가기</Button>
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gbus-text-muted mb-5">
                가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="이메일"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                />

                {error && (
                  <p className="text-sm text-gbus-danger bg-gbus-danger/10 px-4 py-2.5 rounded-xl border border-gbus-danger/20">
                    {error}
                  </p>
                )}

                <Button type="submit" loading={loading} size="lg" className="w-full btn-shine">
                  재설정 링크 보내기
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
