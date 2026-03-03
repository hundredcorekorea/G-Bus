"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { ToastContainer } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PromoCard } from "@/components/ads/PromoCard";
import { POST_TYPE_LABEL, BOARDS, getAnonymousName } from "@/lib/constants";
import type { BoardType } from "@/lib/constants";
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

const postTypeVariant: Record<string, "default" | "accent" | "success" | "warning" | "primary"> = {
  party: "default",
  bus: "accent",
  barrack_bus: "success",
  field_party: "success",
  exp_party: "warning",
  mass_bus: "primary",
};

// 상위던전인증 필요 던전
const UPPER_DUNGEON_NAMES = ["키노", "네버"];
// 상위지역인증 필요 지역
const UPPER_FIELD_NAMES = ["디지털월드", "산들바람", "바람공장"];

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<(BusSession & { driver: User })[]>([]);
  const [myReservations, setMyReservations] = useState<(Reservation & { bus_session: BusSession })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBoard, setActiveBoard] = useState<BoardType>("party");
  const [selectedDungeons, setSelectedDungeons] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
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
                .in("status", ["waiting", "called", "pending"])
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [] }),
        ]);

        setSessions((sessionsRes.data as (BusSession & { driver: User })[]) || []);
        const allRes = (reservationsRes.data as (Reservation & { bus_session: BusSession })[]) || [];
        setMyReservations(allRes.filter((r) => r.bus_session && ["waiting", "running"].includes(r.bus_session.status)));
      } catch (err) {
        console.error("[G-BUS] fetchData error:", err);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // 탭 변경 시 던전 필터 초기화
  const switchBoard = (key: BoardType) => {
    setActiveBoard(key);
    setSelectedDungeons(new Set());
  };

  const currentBoard = BOARDS.find((b) => b.key === activeBoard)!;

  // 현재 게시판에 맞는 세션 필터링
  const filteredSessions = useMemo(() => {
    const board = BOARDS.find((b) => b.key === activeBoard)!;
    let result = sessions.filter((s) => {
      // 던전명이 이 게시판에 속하는지
      // dungeon_name이 콤마로 여러 던전 합쳐진 경우 처리
      const sessionDungeons = s.dungeon_name.split(",");
      const inBoard = sessionDungeons.some((d) => board.dungeons.includes(d));
      if (!inBoard) return false;
      // post_type 제한이 있으면 체크
      if (board.postTypes && !board.postTypes.includes(s.post_type)) return false;

      // 상위던전인증 필터: 키노/네버 포함 글은 인증 필요
      if (!profile?.upper_dungeon_verified) {
        if (sessionDungeons.some((d) => UPPER_DUNGEON_NAMES.includes(d))) return false;
      }
      // 상위지역인증 필터: 디지털월드/산들바람/바람공장은 필드파티에서 인증 필요
      if (!profile?.upper_field_verified) {
        if (sessionDungeons.some((d) => UPPER_FIELD_NAMES.includes(d))) return false;
      }

      return true;
    });
    // 던전 다중 선택 필터
    if (selectedDungeons.size > 0) {
      result = result.filter((s) => {
        const sessionDungeons = s.dungeon_name.split(",");
        return [...selectedDungeons].every((d) => sessionDungeons.includes(d));
      });
    }
    return result;
  }, [sessions, activeBoard, selectedDungeons]);

  // 각 게시판별 세션 수 (탭 카운트용, 인증 필터 적용)
  const boardCounts = useMemo(() => {
    const counts: Record<BoardType, number> = { party: 0, bus: 0, field: 0, exp: 0, mass_bus: 0 };
    for (const s of sessions) {
      const sessionDungeons = s.dungeon_name.split(",");
      // 인증 필터
      if (!profile?.upper_dungeon_verified && sessionDungeons.some((d) => UPPER_DUNGEON_NAMES.includes(d))) continue;
      if (!profile?.upper_field_verified && sessionDungeons.some((d) => UPPER_FIELD_NAMES.includes(d))) continue;
      for (const board of BOARDS) {
        const inBoard = sessionDungeons.some((d) => board.dungeons.includes(d));
        if (inBoard && (!board.postTypes || board.postTypes.includes(s.post_type))) {
          counts[board.key]++;
          break; // 하나의 게시판에만 카운트
        }
      }
    }
    return counts;
  }, [sessions, profile]);

  const toggleDungeon = (name: string) => {
    setSelectedDungeons((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

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
                        {r.status === "pending" ? (
                          <div className="w-10 h-10 rounded-xl bg-gbus-warning/10 border border-gbus-warning/20 flex items-center justify-center text-lg">
                            &#x23F3;
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gbus-accent/10 border border-gbus-accent/20 flex items-center justify-center text-sm font-bold text-gbus-accent">
                            #{r.queue_no}
                          </div>
                        )}
                        <div>
                          <span className="font-semibold">{r.char_name}</span>
                          {r.bus_session && (
                            <p className="text-xs text-gbus-text-dim mt-0.5">
                              {r.bus_session.dungeon_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant={r.status === "called" ? "accent" : r.status === "pending" ? "warning" : "default"}>
                        {r.status === "called" ? "호출됨!" : r.status === "pending" ? "수락 대기" : "대기 중"}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 모집 게시판 */}
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

          {/* 게시판 탭 */}
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            {BOARDS.map((board) => (
              <button
                key={board.key}
                onClick={() => switchBoard(board.key)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 ${
                  activeBoard === board.key
                    ? "bg-gbus-primary text-white shadow-[0_2px_12px_rgba(108,92,231,0.3)]"
                    : "glass text-gbus-text-muted hover:text-gbus-text hover:bg-gbus-surface-light/60"
                }`}
              >
                {board.label}
                {!loading && (
                  <span className={`ml-1.5 text-xs ${activeBoard === board.key ? "text-white/70" : "text-gbus-text-dim"}`}>
                    {boardCounts[board.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 던전 필터 칩 */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {currentBoard.dungeons.filter((name) => {
              if (!profile?.upper_dungeon_verified && UPPER_DUNGEON_NAMES.includes(name)) return false;
              if (!profile?.upper_field_verified && UPPER_FIELD_NAMES.includes(name)) return false;
              return true;
            }).map((name) => (
              <button
                key={name}
                onClick={() => toggleDungeon(name)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all duration-200 ${
                  selectedDungeons.has(name)
                    ? "bg-gbus-accent/15 text-gbus-accent border-gbus-accent/30 shadow-[0_0_8px_rgba(0,206,201,0.1)]"
                    : "bg-gbus-surface-light/40 text-gbus-text-muted border-gbus-border/40 hover:border-gbus-accent/20 hover:text-gbus-text"
                }`}
              >
                {name}
                {selectedDungeons.has(name) && (
                  <span className="ml-1 text-gbus-accent/60">&times;</span>
                )}
              </button>
            ))}
            {selectedDungeons.size > 0 && (
              <button
                onClick={() => setSelectedDungeons(new Set())}
                className="px-2.5 py-1 text-xs text-gbus-danger/80 hover:text-gbus-danger transition-colors"
              >
                초기화
              </button>
            )}
          </div>

          {/* 세션 목록 */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl h-48 shimmer" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="glass rounded-2xl text-center py-16">
              <div className="text-5xl mb-4 opacity-20">&#x1F68C;</div>
              <p className="text-gbus-text-muted font-medium">
                {currentBoard.label}에 모집 중인 글이 없습니다
              </p>
              <p className="text-xs text-gbus-text-dim mt-1">새로운 글을 작성해 보세요</p>
              {selectedDungeons.size > 0 && (
                <button
                  onClick={() => setSelectedDungeons(new Set())}
                  className="mt-3 text-sm text-gbus-accent hover:text-gbus-accent/80 transition-colors"
                >
                  던전 필터 초기화
                </button>
              )}
              <PromoCard placement="waiting" className="mt-8" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSessions.map((s) => (
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
                        {(s.post_type === "party" || s.post_type === "field_party") ? "파장" : s.post_type === "mass_bus" ? "호스트" : "기사"}: <span className="text-gbus-text-muted">
                          {s.status === "waiting" ? getAnonymousName(s.id) : (s.driver?.game_nickname || s.driver?.nickname || "?")}
                        </span>
                      </span>
                      {(s.post_type === "party" || s.post_type === "field_party") ? (
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
                            width: `${Math.min(100, (s.current_count / ((s.post_type === "party" || s.post_type === "field_party") ? (s.party_size || s.min_count) : s.min_count)) * 100)}%`
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
