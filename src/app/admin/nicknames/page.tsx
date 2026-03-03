"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast, ToastContainer } from "@/components/ui/Toast";
import type { NicknameChangeRequest } from "@/lib/types";
import { AdminTabs } from "@/components/admin/AdminTabs";

type RequestWithUser = NicknameChangeRequest & {
  user: { nickname: string; game_nickname: string };
};

export default function AdminNicknamesPage() {
  const [requests, setRequests] = useState<RequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const supabase = createClient();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("nickname_change_requests")
        .select("*, user:users!nickname_change_requests_user_id_fkey(nickname, game_nickname)")
        .order("created_at", { ascending: false });
      if (filter === "pending") {
        query = query.eq("status", "pending");
      }
      const { data } = await query;
      setRequests((data as RequestWithUser[]) || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = async (req: RequestWithUser, action: "approved" | "rejected") => {
    // 승인 시 유저 닉네임도 업데이트
    if (action === "approved") {
      const { error: updateErr } = await supabase
        .from("users")
        .update({ [req.field]: req.new_nickname })
        .eq("id", req.user_id);
      if (updateErr) {
        toast("닉네임 업데이트 실패: " + updateErr.message, "error");
        return;
      }
    }

    const { error } = await supabase
      .from("nickname_change_requests")
      .update({ status: action, reviewed_at: new Date().toISOString() })
      .eq("id", req.id);

    if (error) { toast("처리 실패: " + error.message, "error"); return; }
    toast(action === "approved" ? "승인 완료! 닉네임이 변경되었습니다." : "거절되었습니다.", action === "approved" ? "success" : "info");
    fetchRequests();
  };

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <AdminTabs />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">닉네임 변경 요청</h1>
          <div className="flex gap-2">
            <Button variant={filter === "pending" ? "primary" : "secondary"} size="sm" onClick={() => setFilter("pending")}>대기 중</Button>
            <Button variant={filter === "all" ? "primary" : "secondary"} size="sm" onClick={() => setFilter("all")}>전체</Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gbus-text-muted">로딩 중...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-gbus-text-muted">
            {filter === "pending" ? "대기 중인 요청이 없습니다." : "요청이 없습니다."}
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>
                        {r.status === "approved" ? "승인" : r.status === "rejected" ? "거절" : "대기"}
                      </Badge>
                      <Badge variant="default">
                        {r.field === "game_nickname" ? "인게임 닉네임" : "닉네임"}
                      </Badge>
                      <span className="text-xs text-gbus-text-dim">
                        {new Date(r.created_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-sm mb-1">
                      <span className="text-gbus-text-dim">유저:</span>{" "}
                      <span className="font-medium">{r.user?.nickname}</span>
                      <span className="text-gbus-text-dim ml-1">({r.user?.game_nickname})</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gbus-text-dim">{r.old_nickname}</span>
                      <span className="text-gbus-text-dim mx-2">&rarr;</span>
                      <span className="font-bold text-gbus-primary-light">{r.new_nickname}</span>
                    </div>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => handleAction(r, "approved")}>승인</Button>
                      <Button variant="danger" size="sm" onClick={() => handleAction(r, "rejected")}>거절</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
