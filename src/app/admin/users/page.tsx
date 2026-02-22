"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast, ToastContainer } from "@/components/ui/Toast";
import { REPORT_CATEGORIES, type ReportCategory } from "@/lib/constants";
import type { User, Report } from "@/lib/types";

const roleLabel: Record<string, string> = {
  admin: "관리자",
  moderator: "부관리자",
};

const reportStatusLabel: Record<string, string> = {
  pending: "미처리",
  reviewed: "확인 중",
  warned: "경고",
  actioned: "조치",
  dismissed: "기각",
};
const reportStatusVariant: Record<string, "warning" | "accent" | "danger" | "success" | "default"> = {
  pending: "warning",
  reviewed: "accent",
  warned: "danger",
  actioned: "danger",
  dismissed: "default",
};

type ReportWithReporter = Report & {
  reporter: { nickname: string; game_nickname: string };
};

export default function AdminUsersPage() {
  const { profile: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [userReports, setUserReports] = useState<Record<string, ReportWithReporter[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});
  const supabase = createClient();

  const fetchUsers = async () => {
    try {
      let query = supabase.from("users").select("*").order("created_at", { ascending: false });
      if (filter === "pending") {
        query = query.eq("verified", false);
      }
      const { data } = await query;
      setUsers(data || []);

      // 유저별 신고 데이터 조회 (status 포함)
      if (data && data.length > 0) {
        const ids = data.map((u: User) => u.id);
        const { data: reports } = await supabase
          .from("reports")
          .select("*, reporter:users!reports_reporter_id_fkey(nickname, game_nickname)")
          .in("reported_id", ids)
          .order("created_at", { ascending: false });
        const grouped: Record<string, ReportWithReporter[]> = {};
        for (const r of (reports as ReportWithReporter[]) || []) {
          if (!grouped[r.reported_id]) grouped[r.reported_id] = [];
          grouped[r.reported_id].push(r);
        }
        setUserReports(grouped);
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

  const handleReportAction = async (report: ReportWithReporter, status: "dismissed" | "warned" | "actioned", suspendDays?: number) => {
    const note = adminNote[report.id]?.trim() || null;
    const { error } = await supabase
      .from("reports")
      .update({ status, admin_note: note, reviewed_at: new Date().toISOString() })
      .eq("id", report.id);

    if (error) { toast("처리 실패: " + error.message, "error"); return; }

    const targetUser = users.find((u) => u.id === report.reported_id);

    if (status === "warned" && targetUser) {
      await supabase
        .from("users")
        .update({ honor_score: Math.max(0, targetUser.honor_score - 10) })
        .eq("id", report.reported_id);
    }

    if (status === "actioned" && suspendDays) {
      const until = new Date();
      until.setDate(until.getDate() + suspendDays);
      await supabase
        .from("users")
        .update({ suspended_until: until.toISOString() })
        .eq("id", report.reported_id);
    }

    toast(
      status === "dismissed" ? "기각 처리 (무고)" : status === "warned" ? "경고 처리 (명예 -10)" : `정지 처리 (${suspendDays}일)`,
      status === "dismissed" ? "info" : "success"
    );
    fetchUsers();
  };

  const getReportSummary = (userId: string) => {
    const reports = userReports[userId] || [];
    const pending = reports.filter((r) => r.status === "pending").length;
    const confirmed = reports.filter((r) => r.status === "warned" || r.status === "actioned").length;
    const dismissed = reports.filter((r) => r.status === "dismissed").length;
    return { total: reports.length, pending, confirmed, dismissed };
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
            {users.map((u) => {
              const rs = getReportSummary(u.id);
              const reports = userReports[u.id] || [];
              const isExpanded = expandedUser === u.id;

              return (
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
                        {rs.confirmed > 0 && <Badge variant="danger">제재 {rs.confirmed}건</Badge>}
                        {rs.pending > 0 && <Badge variant="warning">미처리 신고 {rs.pending}건</Badge>}
                        {rs.dismissed > 0 && <span className="text-[10px] text-gbus-text-dim">(기각 {rs.dismissed}건)</span>}
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
                      {/* 신고 내역 토글 */}
                      {rs.total > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                        >
                          신고 {isExpanded ? "접기" : "보기"} ({rs.total})
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

                  {/* 신고 내역 (확장) */}
                  {isExpanded && reports.length > 0 && (
                    <div className="mt-4 border-t border-gbus-border/20 pt-4 space-y-2.5">
                      <h4 className="text-xs font-semibold text-gbus-text-muted mb-2">신고 내역</h4>
                      {reports.map((r) => (
                        <div key={r.id} className={`rounded-lg p-3 text-xs ${
                          r.status === "pending" ? "bg-gbus-warning/5 border border-gbus-warning/15"
                          : r.status === "dismissed" ? "bg-gbus-bg/30 border border-gbus-border/10 opacity-60"
                          : "bg-gbus-danger/5 border border-gbus-danger/15"
                        }`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={reportStatusVariant[r.status]}>{reportStatusLabel[r.status]}</Badge>
                              <Badge variant="danger">{REPORT_CATEGORIES[r.category as ReportCategory] || r.category}</Badge>
                              <span className="text-gbus-text-dim">
                                by {r.reporter?.game_nickname || r.reporter?.nickname}
                              </span>
                            </div>
                            <span className="text-gbus-text-dim">
                              {new Date(r.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <p className="text-gbus-text-muted leading-relaxed">{r.reason}</p>

                          {r.admin_note && r.status !== "pending" && (
                            <p className="text-gbus-primary-light mt-1.5">
                              <span className="font-semibold">메모:</span> {r.admin_note}
                            </p>
                          )}

                          {r.status === "pending" && (
                            <div className="mt-2 pt-2 border-t border-gbus-border/10">
                              <input
                                type="text"
                                placeholder="관리자 메모 (선택)"
                                value={adminNote[r.id] || ""}
                                onChange={(e) => setAdminNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                className="w-full px-2.5 py-1.5 bg-gbus-bg/40 border border-gbus-border/40 rounded-lg text-[11px] text-gbus-text placeholder:text-gbus-text-dim focus:outline-none focus:border-gbus-primary transition-all mb-1.5"
                              />
                              <div className="flex gap-1 flex-wrap">
                                <Button variant="ghost" size="sm" onClick={() => handleReportAction(r, "dismissed")}>기각</Button>
                                <Button variant="secondary" size="sm" onClick={() => handleReportAction(r, "warned")}>경고 (-10)</Button>
                                <Button variant="danger" size="sm" onClick={() => handleReportAction(r, "actioned", 1)}>1일</Button>
                                <Button variant="danger" size="sm" onClick={() => handleReportAction(r, "actioned", 3)}>3일</Button>
                                <Button variant="danger" size="sm" onClick={() => handleReportAction(r, "actioned", 7)}>7일</Button>
                                <Button variant="danger" size="sm" onClick={() => handleReportAction(r, "actioned", 30)}>30일</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
