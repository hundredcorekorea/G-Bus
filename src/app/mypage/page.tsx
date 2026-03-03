"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast, ToastContainer } from "@/components/ui/Toast";
import Link from "next/link";
import type { NicknameChangeRequest } from "@/lib/types";

export default function MyPage() {
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // 닉네임 변경 요청
  const [nickRequests, setNickRequests] = useState<NicknameChangeRequest[]>([]);
  const [showNickForm, setShowNickForm] = useState(false);
  const [nickField, setNickField] = useState<"game_nickname" | "nickname">("game_nickname");
  const [newNickname, setNewNickname] = useState("");
  const [submittingNick, setSubmittingNick] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("nickname_change_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setNickRequests((data as NicknameChangeRequest[]) || []));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNicknameRequest = async () => {
    if (!newNickname.trim()) { toast("변경할 닉네임을 입력하세요.", "error"); return; }
    if (!user || !profile) return;

    const oldName = nickField === "game_nickname" ? profile.game_nickname : profile.nickname;
    if (newNickname.trim() === oldName) { toast("현재 닉네임과 동일합니다.", "error"); return; }

    // 이미 대기 중인 요청이 있는지 확인
    const hasPending = nickRequests.some((r) => r.status === "pending" && r.field === nickField);
    if (hasPending) { toast("이미 대기 중인 변경 요청이 있습니다.", "error"); return; }

    setSubmittingNick(true);
    const { error } = await supabase.from("nickname_change_requests").insert({
      user_id: user.id,
      old_nickname: oldName,
      new_nickname: newNickname.trim(),
      field: nickField,
    });
    setSubmittingNick(false);

    if (error) { toast("요청 실패: " + error.message, "error"); return; }
    toast("닉네임 변경 요청이 제출되었습니다. 관리자 승인을 기다려 주세요.", "success");
    setNewNickname(""); setShowNickForm(false);

    // 새로고침
    const { data } = await supabase
      .from("nickname_change_requests")
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
    setNickRequests((data as NicknameChangeRequest[]) || []);
  };

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

  const pendingNickRequest = nickRequests.find((r) => r.status === "pending");

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-lg mx-auto px-4 py-8 animate-fade-up">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-gbus-primary rounded-full" />
          마이페이지
        </h1>

        {/* 프로필 정보 */}
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-gbus-text-dim">주인 레벨</span>
              <span className="text-sm font-medium">{profile?.tamer_lv || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gbus-text-dim">하인 최고 레벨</span>
              <span className="text-sm font-medium">{profile?.digi_lv || 0}</span>
            </div>

            <div className="border-t border-gbus-border/20 pt-3 mt-3" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-gbus-text-dim">가입 인증</span>
              <div className="flex items-center gap-1.5">
                {profile?.verified ? (
                  <Badge variant="success">승인됨</Badge>
                ) : (
                  <Badge variant="warning">대기 중</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gbus-text-dim">인증 현황</span>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {profile?.barrack_verified ? (
                  <Badge variant="success">배럭</Badge>
                ) : (
                  <Badge variant="default">배럭</Badge>
                )}
                {profile?.upper_dungeon_verified ? (
                  <Badge variant="success">상위던전</Badge>
                ) : (
                  <Badge variant="default">상위던전</Badge>
                )}
                {profile?.upper_field_verified ? (
                  <Badge variant="success">상위지역</Badge>
                ) : (
                  <Badge variant="default">상위지역</Badge>
                )}
                {profile?.driver_verified ? (
                  <Badge variant="success">기사</Badge>
                ) : (
                  <Badge variant="default">기사</Badge>
                )}
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

          <div className="mt-4 p-3 rounded-xl bg-gbus-warning/5 border border-gbus-warning/15">
            <p className="text-[11px] text-gbus-warning font-medium">
              인게임 닉네임과 실제 닉네임이 불일치할 경우 제재 대상입니다.
            </p>
          </div>
        </div>

        {/* 닉네임 변경 요청 */}
        <div className="glass rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-gbus-text-muted mb-4">닉네임 변경 요청</h2>

          {pendingNickRequest && (
            <div className="bg-gbus-warning/8 border border-gbus-warning/20 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="warning">대기 중</Badge>
                <span className="text-xs text-gbus-text-dim">
                  {pendingNickRequest.field === "game_nickname" ? "인게임 닉네임" : "닉네임"}
                </span>
              </div>
              <p className="text-sm">
                <span className="text-gbus-text-dim">{pendingNickRequest.old_nickname}</span>
                <span className="text-gbus-text-dim mx-2">&rarr;</span>
                <span className="font-semibold">{pendingNickRequest.new_nickname}</span>
              </p>
            </div>
          )}

          {!showNickForm ? (
            <Button variant="secondary" size="sm" onClick={() => setShowNickForm(true)} className="w-full">
              닉네임 변경 요청하기
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setNickField("game_nickname")}
                  className={`flex-1 py-2 text-xs rounded-xl border transition-all font-medium ${
                    nickField === "game_nickname"
                      ? "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-primary-light"
                      : "border-gbus-border/40 text-gbus-text-dim"
                  }`}
                >
                  인게임 닉네임
                </button>
                <button
                  onClick={() => setNickField("nickname")}
                  className={`flex-1 py-2 text-xs rounded-xl border transition-all font-medium ${
                    nickField === "nickname"
                      ? "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-primary-light"
                      : "border-gbus-border/40 text-gbus-text-dim"
                  }`}
                >
                  닉네임
                </button>
              </div>
              <div className="text-xs text-gbus-text-dim">
                현재: <span className="text-gbus-text-muted font-medium">
                  {nickField === "game_nickname" ? profile?.game_nickname : profile?.nickname}
                </span>
              </div>
              <Input
                label="새 닉네임"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="변경할 닉네임 입력"
              />
              <div className="flex gap-2">
                <Button onClick={handleNicknameRequest} loading={submittingNick} disabled={!newNickname.trim()} className="flex-1">
                  요청 제출
                </Button>
                <Button variant="ghost" onClick={() => { setShowNickForm(false); setNewNickname(""); }}>취소</Button>
              </div>
            </div>
          )}

          {/* 요청 히스토리 */}
          {nickRequests.length > 0 && (
            <div className="mt-4 border-t border-gbus-border/20 pt-3">
              <p className="text-xs text-gbus-text-dim mb-2">변경 이력</p>
              <div className="space-y-1.5">
                {nickRequests.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>
                        {r.status === "approved" ? "승인" : r.status === "rejected" ? "거절" : "대기"}
                      </Badge>
                      <span className="text-gbus-text-dim">{r.old_nickname}</span>
                      <span className="text-gbus-text-dim">&rarr;</span>
                      <span className="font-medium">{r.new_nickname}</span>
                    </div>
                    <span className="text-gbus-text-dim">
                      {new Date(r.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 배럭 관리 바로가기 */}
        <Link href="/barrack">
          <div className="glass rounded-2xl p-5 mb-4 flex items-center justify-between hover:border-gbus-primary/30 transition-all duration-300 cursor-pointer group">
            <div>
              <h2 className="text-sm font-semibold text-gbus-text-muted mb-1">배럭 관리</h2>
              <p className="text-xs text-gbus-text-dim">캐릭터 닉네임과 레벨을 등록/수정합니다</p>
            </div>
            <span className="text-gbus-text-dim group-hover:text-gbus-primary-light transition-colors text-lg">&#x203A;</span>
          </div>
        </Link>

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
