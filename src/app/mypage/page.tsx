"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast, ToastContainer } from "@/components/ui/Toast";

export default function MyPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast("비밀번호는 8자 이상이어야 합니다.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast("비밀번호가 일치하지 않습니다.", "error");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) {
      toast("비밀번호 변경 실패: " + error.message, "error");
      return;
    }

    toast("비밀번호가 변경되었습니다.", "success");
    setNewPassword("");
    setConfirmPassword("");
  };

  const roleName = profile?.is_admin
    ? "관리자"
    : profile?.is_moderator
      ? "부관리자"
      : "일반 유저";

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-lg mx-auto px-4 py-8 animate-fade-up">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-gbus-primary rounded-full" />
          마이페이지
        </h1>

        {/* 프로필 정보 (읽기 전용) */}
        <div className="glass rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-gbus-text-muted mb-4">내 정보</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gbus-text-dim">이메일</span>
              <span className="text-sm font-medium">{user?.email || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gbus-text-dim">닉네임</span>
              <span className="text-sm font-medium">{profile?.nickname || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gbus-text-dim">인게임 닉네임</span>
              <span className="text-sm font-medium">{profile?.game_nickname || "-"}</span>
            </div>

            <div className="border-t border-gbus-border/20 pt-3 mt-3" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-gbus-text-dim">인증 상태</span>
              <div className="flex items-center gap-1.5">
                {profile?.verified ? (
                  <Badge variant="success">승인됨</Badge>
                ) : (
                  <Badge variant="warning">대기 중</Badge>
                )}
                {profile?.barrack_verified && <Badge variant="success">배럭 인증</Badge>}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gbus-text-dim">역할</span>
              <span className="text-sm font-medium">{roleName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gbus-text-dim">명예 점수</span>
              <span className="text-sm font-medium">{profile?.honor_score ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gbus-text-dim">노쇼 횟수</span>
              <span className="text-sm font-medium">{profile?.noshow_count ?? 0}회</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gbus-text-dim">가입일</span>
              <span className="text-sm font-medium">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("ko-KR")
                  : "-"}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-gbus-text-dim mt-4">
            닉네임/인게임 닉네임 변경은 디스코드 재인증이 필요하여 직접 변경이 불가합니다.
          </p>
        </div>

        {/* 비밀번호 변경 */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gbus-text-muted mb-4">비밀번호 변경</h2>

          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
            <Input
              label="새 비밀번호"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8자 이상"
              minLength={8}
              required
            />
            <Input
              label="새 비밀번호 확인"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호 재입력"
              minLength={8}
              required
            />
            <Button type="submit" loading={saving} className="w-full mt-1 btn-shine">
              비밀번호 변경
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
