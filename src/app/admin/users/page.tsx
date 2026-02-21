"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import type { User } from "@/lib/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const supabase = createClient();

  const fetchUsers = async () => {
    let query = supabase.from("users").select("*").order("created_at", { ascending: false });
    if (filter === "pending") {
      query = query.eq("verified", false);
    }
    const { data } = await query;
    setUsers(data || []);
    setLoading(false);
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

  return (
    <div className="min-h-screen">
      <Header />
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
                className="bg-gbus-surface border border-gbus-border rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{u.nickname}</span>
                    {u.verified ? (
                      <Badge variant="success">승인됨</Badge>
                    ) : (
                      <Badge variant="warning">대기 중</Badge>
                    )}
                    {u.is_admin && <Badge variant="accent">관리자</Badge>}
                  </div>
                  <div className="text-sm text-gbus-text-muted">
                    인게임: <span className="text-gbus-text">{u.game_nickname}</span>
                    {u.game_server && (
                      <span className="ml-2 text-gbus-text-dim">({u.game_server})</span>
                    )}
                  </div>
                  <div className="text-xs text-gbus-text-dim mt-1">
                    명예 점수: {u.honor_score} | 노쇼: {u.noshow_count}회 |{" "}
                    가입: {new Date(u.created_at).toLocaleDateString("ko-KR")}
                  </div>
                </div>

                {!u.verified && (
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" onClick={() => handleVerify(u.id)}>
                      승인
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleReject(u.id)}>
                      거절
                    </Button>
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
