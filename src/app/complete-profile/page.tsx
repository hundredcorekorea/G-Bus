"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";

type AgreementKey = "terms" | "privacy";

export default function CompleteProfilePage() {
  const [nickname, setNickname] = useState("");
  const [gameNickname, setGameNickname] = useState("");
  const [agreed, setAgreed] = useState<Record<AgreementKey, boolean>>({ terms: false, privacy: false });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      // 이미 프로필 완성된 유저는 대시보드로
      const { data: profile } = await supabase
        .from("users")
        .select("game_nickname")
        .eq("id", user.id)
        .single();

      if (profile?.game_nickname) {
        router.replace("/dashboard");
        return;
      }

      // OAuth에서 가져온 이름을 기본값으로
      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.display_name ||
        "";
      setNickname(displayName);
      setChecking(false);
    };
    check();
  }, [supabase, router]);

  const allAgreed = agreed.terms && agreed.privacy;

  const toggleAll = (checked: boolean) => {
    setAgreed({ terms: checked, privacy: checked });
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("인증 정보가 없습니다. 다시 로그인해주세요.");
      setLoading(false);
      return;
    }

    // users 테이블 업데이트 (트리거로 이미 생성되었을 수 있음)
    const { error: upsertError } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        nickname: nickname.trim(),
        game_nickname: gameNickname.trim(),
        hc_account_id: user.id,
      }, { onConflict: "id" });

    if (upsertError) {
      setError(upsertError.message);
      setLoading(false);
      return;
    }

    // hc_profiles 업데이트 (display_name 동기화)
    await supabase
      .from("hc_profiles")
      .update({ display_name: nickname.trim() })
      .eq("id", user.id);

    router.push("/pending");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-bg">
        <div className="text-gbus-text-muted text-sm">확인 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 hero-bg">
      <div className="w-full max-w-md animate-fade-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gbus-primary/10 border border-gbus-primary/20 mb-4">
            <span className="text-2xl font-black gradient-text">G</span>
          </div>
          <div className="text-2xl font-black gradient-text">프로필 설정</div>
          <div className="text-xs text-gbus-text-dim mt-1.5 tracking-wide">
            G-BUS 이용을 위해 추가 정보를 입력해주세요
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          {/* HC 통합 계정 안내 */}
          <div className="mb-5 px-3 py-3 rounded-xl bg-gbus-primary/5 border border-gbus-primary/10 text-center">
            <p className="text-xs font-semibold text-gbus-primary-light">Hundred Core 통합 계정이 생성되었습니다</p>
            <p className="text-[10px] text-gbus-text-muted mt-1">
              이 계정으로 G-BUS, 냥퀘스트, 젤리포켓 등 모든 HC 앱을 이용할 수 있습니다
            </p>
          </div>

          <form onSubmit={handleComplete} className="flex flex-col gap-4">
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

            {error && (
              <p className="text-sm text-gbus-danger bg-gbus-danger/10 px-4 py-2.5 rounded-xl border border-gbus-danger/20">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} size="lg" className="w-full mt-2 btn-shine">
              프로필 완성하기
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
