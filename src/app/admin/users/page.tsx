"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast, ToastContainer } from "@/components/ui/Toast";
import type { User } from "@/lib/types";

const roleLabel: Record<string, string> = {
  admin: "관리자",
  moderator: "부관리자",
};

export default function AdminUsersPage() {
  const { profile: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const supabase = createClient();

  const fetchUsers = async () => {
    try {
      let query = supabase.from("users").select("*").order("created_at", { ascending: false });
      if (filter === "pending") {
        query = query.eq("verified", false);
      }
      const { data } = await query;
      setUsers(data || []);

      // 유저별 신고 건수 조회
      if (data && data.length > 0) {
        const ids = data.map((u: User) => u.id);
        const { data: reports } = await supabase
          .from("reports")
          .select("reported_id")
          .in("reported_id", ids);
        const counts: Record<string, number> = {};
        for (const r of reports || []) {
          counts[r.reported_id] = (counts[r.reported_id] || 0) + 1;
        }
        setReportCounts(counts);
      }
    } catch {
      // 쿼리 실패 시 빈 목록 표시
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = async (userId: string) => {
    const { error } = await supabase
      .from("users")
      .update({ verified: true })
      .eq("id", userId);
    if (error) {
      toast("승인 실패: " + error.message, "error");
      return;
    }
    toast("유저가 승인되었습니다.", "success");
    fetchUsers();
  };

  const handleReject = async (userId: string) => {
    if (!confirm("정말 이 유저를 거절(삭제)하시겠습니까?")) return;
    const { error } = await supabase.from("users").delete().eq("id", userId);
    if (error) {
      toast("거절 실패: " + error.message, "error");
      return;
    }
    toast("유저가 거절되었습니다.", "success");
    fetchUsers();
  };

  const handleBarrackVerify = async (userId: string, verified: boolean) => {
    const { error } = await supabase
      .from("users")
      .update({ barrack_verified: verified })
      .eq("id", userId);
    if (error) {
      toast("배럭 인증 변경 실패: " + error.message, "error");
      return;
    }
    toast(verified ? "배럭 인증 완료" : "배럭 인증 해제", "success");
    fetchUsers();
  };

  const handleUnsuspend = async (userId: string) => {
    const { error } = await supabase.from("users").update({ suspended_until: null }).eq("id", userId);
    if (error) { toast("정지 해제 실패: " + error.message, "error"); return; }
    toast("정지가 해제되었습니다.", "success");
    fetchUsers();
  };

  // 역할 변경 (admin만 가능)
  const handleRoleChange = async (userId: string, role: string) => {
    if (!me?.is_admin) {
      toast("관리자만 역할을 변경할 수 있습니다.", "error");
      return;
    }
    const updates: Record<string, boolean> = {
      is_admin: role === "admin",
      is_moderator: role === "moderator",
    };
    if (role === "user") {
      updates.is_admin = false;
      updates.is_moderator = false;
    }
    const { error } = await supabase.from("users").update(updates).eq("id", userId);
    if (error) {
      toast("역할 변경 실패: " + error.message, "error");
      return;
    }
    toast(`${roleLabel[role] || "일반 유저"}로 변경되었습니다.`, "success");
    fetchUsers();
  };

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">유저 관리</h1>
          <div className="flex gap-2">
            <Button
              variant={filter === "pending" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilter("pending")}
            >
              대기 중
            </Button>
            <Button
              variant={filter === "all" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              전체
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gbus-text-muted">로딩 중...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gbus-text-muted">
            {filter === "pending" ? "승인 대기 중인 유저가 없습니다." : "유저가 없습니다."}
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-gbus-surface border border-gbus-border rounded-xl p-4"
              >
                <div className="flex items-start gap-4">
                  {/* 유저 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium">{u.nickname}</span>
                      {u.verified ? (
                        <Badge variant="success">승인됨</Badge>
                      ) : (
                        <Badge variant="warning">대기 중</Badge>
                      )}
                      {u.barrack_verified && <Badge variant="success">배럭 인증</Badge>}
                      {u.is_admin && <Badge variant="accent">관리자</Badge>}
                      {u.is_moderator && <Badge variant="accent">부관리자</Badge>}
                      {(reportCounts[u.id] || 0) > 0 && <Badge variant="danger">신고 {reportCounts[u.id]}건</Badge>}
                      {u.suspended_until && new Date(u.suspended_until) > new Date() && (
                        <Badge variant="danger">정지 중 (~{new Date(u.suspended_until).toLocaleDateString("ko-KR")})</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gbus-text-muted">
                      인게임: <span className="text-gbus-text">{u.game_nickname}</span>
                    </div>
                    <div className="text-xs text-gbus-text-dim mt-1">
                      명예 점수: {u.honor_score} | 노쇼: {u.noshow_count}회 |{" "}
                      가입: {new Date(u.created_at).toLocaleDateString("ko-KR")}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {!u.verified && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleVerify(u.id)}>
                          승인
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleReject(u.id)}>
                          거절
                        </Button>
                      </div>
                    )}
                    {/* 배럭 인증 토글 (승인된 유저만) */}
                    {u.verified && (
                      <Button
                        variant={u.barrack_verified ? "danger" : "secondary"}
                        size="sm"
                        onClick={() => handleBarrackVerify(u.id, !u.barrack_verified)}
                      >
                        {u.barrack_verified ? "배럭 해제" : "배럭 인증"}
                      </Button>
                    )}
                    {/* 정지 해제 */}
                    {u.suspended_until && new Date(u.suspended_until) > new Date() && (
                      <Button variant="secondary" size="sm" onClick={() => handleUnsuspend(u.id)}>
                        정지 해제
                      </Button>
                    )}
                    {/* 역할 관리 (admin만 보임) */}
                    {u.verified && me?.is_admin && u.id !== me.id && (
                      <select
                        className="px-2 py-1 bg-gbus-bg border border-gbus-border rounded-lg text-xs text-gbus-text cursor-pointer"
                        value={u.is_admin ? "admin" : u.is_moderator ? "moderator" : "user"}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="user">일반 유저</option>
                        <option value="moderator">부관리자</option>
                        <option value="admin">관리자</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
