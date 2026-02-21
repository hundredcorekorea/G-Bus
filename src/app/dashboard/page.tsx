"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PromoCard } from "@/components/ads/PromoCard";
import { POST_TYPE_LABEL } from "@/lib/constants";
import Link from "next/link";
import type { BusSession, User, Reservation, PostType } from "@/lib/types";

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

const postTypeVariant: Record<PostType, "default" | "accent" | "success"> = {
  party: "default",
  bus: "accent",
  barrack_bus: "success",
};

export default function DashboardPage() {
  const [sessions, setSessions] = useState<(BusSession & { driver: User })[]>([]);
  const [myReservations, setMyReservations] = useState<(Reservation & { bus_session: BusSession })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
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
      } catch {
        // 쿼리 실패 시 빈 상태로 표시
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel("dashboard-sessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "bus_sessions" }, () => {
        fetchData();
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
          <section className="mb-8 animate-fade-up">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2.5">
              <span className="w-1.5 h-5 bg-gbus-accent rounded-full" />
              내 예약
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myReservations.map((r) => (
                <Link key={r.id} href={`/session/${r.session_id}`}>
                  <div className="glass rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:border-gbus-accent/30 hover:shadow-[0_8px_32px_rgba(0,206,201,0.08)] cursor-pointer border-glow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gbus-accent/10 border border-gbus-accent/20 flex items-center justify-center text-sm font-bold text-gbus-accent">
                          #{r.queue_no}
                        </div>
                        <div>
                          <span className="font-semibold">{r.char_name}</span>
                          {r.bus_session && (
                            <p className="text-xs text-gbus-text-dim mt-0.5">
                              {r.bus_session.dungeon_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={r.status === "called" ? "accent" : "default"}>
                        {r.status === "called" ? "호출됨!" : "대기 중"}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 세션 목록 */}
        <section className="animate-fade-up-d1">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold flex items-center gap-2.5">
              <span className="w-1.5 h-5 bg-gbus-primary rounded-full" />
              모집 게시판
            </h2>
            <Link href="/session/new">
              <Button size="sm" className="btn-shine">+ 글 작성</Button>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl h-48 shimmer" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="glass rounded-2xl text-center py-20">
              <div className="text-5xl mb-4 opacity-20">&#x1F68C;</div>
              <p className="text-gbus-text-muted font-medium">현재 모집 중인 글이 없습니다</p>
              <p className="text-xs text-gbus-text-dim mt-1">새로운 글을 작성해 보세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((s) => (
                <Link key={s.id} href={`/session/${s.id}`}>
                  <div className="glass rounded-2xl p-5 h-full transition-all duration-300 hover:-translate-y-1 border-glow cursor-pointer group">
                    {/* 배지 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Badge variant={postTypeVariant[s.post_type]}>
                          {POST_TYPE_LABEL[s.post_type]}
                        </Badge>
                        {s.price_type === "auction" && (
                          <Badge variant="warning">역경매</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {s.status === "running" && <span className="status-dot status-dot-live" />}
                        <Badge variant={statusVariant[s.status]}>{statusLabel[s.status]}</Badge>
                      </div>
                    </div>

                    {/* 제목 */}
                    <h3 className="font-bold truncate mb-1 group-hover:text-gbus-primary-light transition-colors">{s.title}</h3>
                    <p className="text-sm text-gbus-text-muted mb-4">{s.dungeon_name}</p>

                    {/* 기사 + 인원 */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gbus-text-dim">
                        {s.post_type === "party" ? "파장" : "기사"}: <span className="text-gbus-text-muted">{s.driver?.game_nickname || s.driver?.nickname || "?"}</span>
                      </span>
                      {s.post_type === "party" ? (
                        <span className="text-gbus-text-muted font-medium">
                          {s.current_count}/{s.party_size || s.min_count}인
                        </span>
                      ) : (
                        <span className={s.current_count >= s.min_count ? "text-gbus-success font-bold" : "text-gbus-text-muted font-medium"}>
                          {s.current_count}/{s.min_count}명
                        </span>
                      )}
                    </div>

                    {/* 프로그레스 바 */}
                    <div className="mt-3">
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${Math.min(100, (s.current_count / (s.post_type === "party" ? (s.party_size || s.min_count) : s.min_count)) * 100)}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* 가격 + 시간 */}
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-gbus-text-dim">~{s.avg_round_minutes}분/회</span>
                      {s.price_t != null && (
                        <span className="text-gbus-accent font-bold">
                          {s.price_type === "auction" ? `희망 ${s.price_t}T` : `${s.price_t}T`}
                        </span>
                      )}
                      {s.price_type === "auction" && s.price_t == null && (
                        <span className="text-gbus-warning font-medium">제안 대기</span>
                      )}
                    </div>

                    {s.scheduled_start && (
                      <div className="mt-1.5 text-xs text-gbus-text-dim">
                        시작: {new Date(s.scheduled_start).toLocaleString("ko-KR", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <PromoCard placement="waiting" className="mt-8" />
      </main>
    </div>
  );
}
