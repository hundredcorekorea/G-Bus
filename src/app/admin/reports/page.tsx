"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast, ToastContainer } from "@/components/ui/Toast";
import { REPORT_CATEGORIES, type ReportCategory } from "@/lib/constants";
import type { Report } from "@/lib/types";

const statusLabel: Record<string, string> = {
  pending: "대기 중",
  reviewed: "확인 중",
  warned: "경고",
  actioned: "조치 완료",
  dismissed: "기각",
};
const statusVariant: Record<string, "warning" | "accent" | "danger" | "success" | "default"> = {
  pending: "warning",
  reviewed: "accent",
  warned: "danger",
  actioned: "danger",
  dismissed: "default",
};

type ReportWithUsers = Report & {
  reporter: { nickname: string; game_nickname: string };
  reported: { nickname: string; game_nickname: string; honor_score: number };
};

export default function AdminReportsPage() {
  const { profile: me } = useAuth();
  const [reports, setReports] = useState<ReportWithUsers[]>([]);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});
  const supabase = createClient();

  const fetchReports = async () => {
    let query = supabase
      .from("reports")
      .select("*, reporter:users!reports_reporter_id_fkey(nickname, game_nickname), reported:users!reports_reported_id_fkey(nickname, game_nickname, honor_score)")
      .order("created_at", { ascending: false });

    if (filter === "pending") {
      query = query.eq("status", "pending");
    }

    const { data } = await query;
    const fetched = (data as ReportWithUsers[]) || [];
    setReports(fetched);

    // 피신고자별 누적 건수
    const counts: Record<string, number> = {};
    for (const r of fetched) {
      counts[r.reported_id] = (counts[r.reported_id] || 0) + 1;
    }
    // pending 필터일 때는 전체 건수도 가져옴
    if (filter === "pending") {
      const reportedIds = [...new Set(fetched.map((r) => r.reported_id))];
      if (reportedIds.length > 0) {
        const { data: allData } = await supabase
          .from("reports")
          .select("reported_id")
          .in("reported_id", reportedIds);
        const allCounts: Record<string, number> = {};
        for (const r of allData || []) {
          allCounts[r.reported_id] = (allCounts[r.reported_id] || 0) + 1;
        }
        setReportCounts(allCounts);
      }
    } else {
      setReportCounts(counts);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (me?.is_admin || me?.is_moderator) fetchReports();
  }, [filter, me]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = async (reportId: string, status: "dismissed" | "warned" | "actioned", suspendDays?: number) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    const note = adminNote[reportId]?.trim() || null;
    const { error } = await supabase
      .from("reports")
      .update({ status, admin_note: note, reviewed_at: new Date().toISOString() })
      .eq("id", reportId);

    if (error) { toast("처리 실패: " + error.message, "error"); return; }

    // 경고: honor_score 감소
    if (status === "warned") {
      await supabase
        .from("users")
        .update({ honor_score: Math.max(0, report.reported.honor_score - 10) })
        .eq("id", report.reported_id);
    }

    // 정지: suspended_until 설정
    if (status === "actioned" && suspendDays) {
      const until = new Date();
      until.setDate(until.getDate() + suspendDays);
      await supabase
        .from("users")
        .update({ suspended_until: until.toISOString() })
        .eq("id", report.reported_id);
    }

    toast(
      status === "dismissed" ? "기각 처리되었습니다." : status === "warned" ? "경고 처리 완료 (명예 -10)" : `정지 처리 완료 (${suspendDays}일)`,
      status === "dismissed" ? "info" : "success"
    );
    fetchReports();
  };

  if (!me?.is_admin && !me?.is_moderator) {
    return (
      <div className="min-h-screen"><Header />
        <div className="text-center py-20 text-gbus-text-muted">접근 권한이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-gbus-danger rounded-full" />
            신고 관리
          </h1>
          <div className="flex gap-2">
            <Button variant={filter === "pending" ? "primary" : "secondary"} size="sm" onClick={() => setFilter("pending")}>대기 중</Button>
            <Button variant={filter === "all" ? "primary" : "secondary"} size="sm" onClick={() => setFilter("all")}>전체</Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gbus-text-muted">로딩 중...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-gbus-text-muted">
            {filter === "pending" ? "처리 대기 중인 신고가 없습니다." : "신고 기록이 없습니다."}
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="bg-gbus-surface border border-gbus-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={statusVariant[r.status]}>{statusLabel[r.status]}</Badge>
                      <Badge variant="danger">{REPORT_CATEGORIES[r.category as ReportCategory] || r.category}</Badge>
                      {(reportCounts[r.reported_id] || 0) > 1 && (
                        <Badge variant="warning">누적 {reportCounts[r.reported_id]}건</Badge>
                      )}
                    </div>
                    <div className="text-sm mt-2">
                      <span className="text-gbus-text-dim">신고자:</span>{" "}
                      <span className="text-gbus-text-muted">{r.reporter?.game_nickname || r.reporter?.nickname}</span>
                      <span className="text-gbus-text-dim mx-2">→</span>
                      <span className="text-gbus-text-dim">피신고자:</span>{" "}
                      <span className="text-gbus-text font-semibold">{r.reported?.game_nickname || r.reported?.nickname}</span>
                      <span className="text-gbus-text-dim ml-1 text-xs">(명예 {r.reported?.honor_score})</span>
                    </div>
                  </div>
                  <span className="text-xs text-gbus-text-dim flex-shrink-0 ml-2">
                    {new Date(r.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* 사유 */}
                <div className="bg-gbus-bg/40 rounded-lg p-3 mb-3 text-sm text-gbus-text-muted">
                  {r.reason}
                </div>

                {/* 관리자 메모 (처리 완료 시 표시) */}
                {r.admin_note && r.status !== "pending" && (
                  <div className="bg-gbus-primary/5 border border-gbus-primary/15 rounded-lg p-3 mb-3 text-xs text-gbus-text-muted">
                    <span className="text-gbus-primary-light font-semibold">관리자 메모:</span> {r.admin_note}
                  </div>
                )}

                {/* 액션 (pending일 때만) */}
                {r.status === "pending" && (
                  <div className="border-t border-gbus-border/20 pt-3">
                    <input
                      type="text"
                      placeholder="관리자 메모 (선택)"
                      value={adminNote[r.id] || ""}
                      onChange={(e) => setAdminNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      className="w-full px-3 py-2 bg-gbus-bg/40 border border-gbus-border/40 rounded-lg text-xs text-gbus-text placeholder:text-gbus-text-dim focus:outline-none focus:border-gbus-primary transition-all mb-2"
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      <Button variant="ghost" size="sm" onClick={() => handleAction(r.id, "dismissed")}>기각 (무고)</Button>
                      <Button variant="secondary" size="sm" onClick={() => handleAction(r.id, "warned")}>경고 (명예 -10)</Button>
                      <Button variant="danger" size="sm" onClick={() => handleAction(r.id, "actioned", 1)}>1일 정지</Button>
                      <Button variant="danger" size="sm" onClick={() => handleAction(r.id, "actioned", 3)}>3일 정지</Button>
                      <Button variant="danger" size="sm" onClick={() => handleAction(r.id, "actioned", 7)}>7일 정지</Button>
                      <Button variant="danger" size="sm" onClick={() => handleAction(r.id, "actioned", 30)}>30일 정지</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
