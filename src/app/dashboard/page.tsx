"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PromoCard } from "@/components/ads/PromoCard";
import Link from "next/link";
import type { BusSession, User, Reservation } from "@/lib/types";

const statusLabel: Record<BusSession["status"], string> = {
  waiting: "대기 중",
  running: "운행 중",
  completed: "완료",
  cancelled: "취소됨",
};
const statusVariant: Record<BusSession["status"], "warning" | "success" | "default" | "danger"> = {
  waiting: "warning",
  running: "success",
  completed: "default",
  cancelled: "danger",
};

export default function DashboardPage() {
  const [sessions, setSessions] = useState<(BusSession & { driver: User })[]>([]);
  const [myReservations, setMyReservations] = useState<(Reservation & { bus_session: BusSession })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const [sessionsRes, reservationsRes] = await Promise.all([
        supabase
          .from("bus_sessions")
          .select("*, driver:users!bus_sessions_driver_id_fkey(nickname, game_nickname)")
          .in("status", ["waiting", "running"])
          .order("created_at", { ascending: false }),
        user
          ? supabase
              .from("reservations")
              .select("*, bus_session:bus_sessions(*)")
              .eq("user_id", user.id)
              .in("status", ["waiting", "called"])
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      setSessions((sessionsRes.data as (BusSession & { driver: User })[]) || []);
      setMyReservations((reservationsRes.data as (Reservation & { bus_session: BusSession })[]) || []);
      setLoading(false);
    };

    fetch();

    // 실시간 세션 업데이트 구독
    const channel = supabase
      .channel("dashboard-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "bus_sessions" }, () => {
        fetch();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 내 예약 */}
        {myReservations.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">내 예약</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myReservations.map((r) => (
                <Link key={r.id} href={`/session/${r.session_id}`}>
                  <Card className="hover:border-gbus-primary transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{r.char_name}</span>
                        <span className="text-gbus-text-muted text-sm ml-2">
                          #{r.queue_no}번
                        </span>
                      </div>
                      <Badge variant={r.status === "called" ? "accent" : "default"}>
                        {r.status === "called" ? "호출됨!" : "대기 중"}
                      </Badge>
                    </div>
                    {r.bus_session && (
                      <p className="text-xs text-gbus-text-dim mt-1">
                        {r.bus_session.title} - {r.bus_session.dungeon_name}
                      </p>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 세션 목록 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">버스 세션</h2>
            <Link href="/session/new">
              <Button size="sm">+ 세션 만들기</Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gbus-text-muted">로딩 중...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-gbus-text-muted">
              현재 진행 중인 세션이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((s) => (
                <Link key={s.id} href={`/session/${s.id}`}>
                  <Card className="hover:border-gbus-primary transition-colors cursor-pointer h-full">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold truncate">{s.title}</h3>
                      <Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge>
                    </div>
                    <p className="text-sm text-gbus-text-muted mb-3">{s.dungeon_name}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gbus-text-dim">
                        기사: {s.driver?.game_nickname || s.driver?.nickname || "?"}
                      </span>
                      <span
                        className={
                          s.current_count >= s.min_count
                            ? "text-gbus-success font-medium"
                            : "text-gbus-text-muted"
                        }
                      >
                        {s.current_count}/{s.min_count}명
                      </span>
                    </div>
                    {s.current_count >= s.min_count && (
                      <div className="mt-2 text-xs text-gbus-success">
                        수익 구간 진입!
                      </div>
                    )}
                    <div className="mt-2 text-xs text-gbus-text-dim">
                      라운드 {s.round} | ~{s.avg_round_minutes}분/회
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 대기 화면 프로모션 */}
        <PromoCard placement="waiting" className="mt-8" />
      </main>
    </div>
  );
}
