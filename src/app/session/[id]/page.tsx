"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeQueue } from "@/lib/hooks/useRealtimeQueue";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { toast, ToastContainer } from "@/components/ui/Toast";
import { PromoCard } from "@/components/ads/PromoCard";
import { QUEUE_ALERT_BEFORE, NOSHOW_PENALTY_SCORE } from "@/lib/constants";
import type { Barrack } from "@/lib/types";

const statusLabel = { waiting: "대기 중", running: "운행 중", completed: "완료", cancelled: "취소됨" };
const statusVariant = { waiting: "warning" as const, running: "success" as const, completed: "default" as const, cancelled: "danger" as const };

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const { session, reservations, loading, refetch } = useRealtimeQueue(sessionId);
  const { user, profile } = useAuth();
  const [barracks, setBarracks] = useState<Barrack[]>([]);
  const [selectedBarracks, setSelectedBarracks] = useState<string[]>([]);
  const [reserving, setReserving] = useState(false);
  const [showReservePanel, setShowReservePanel] = useState(false);
  const supabase = createClient();

  const isDriver = session?.driver_id === user?.id;
  const waitingReservations = reservations.filter((r) => r.status === "waiting");
  const calledReservation = reservations.find((r) => r.status === "called");
  const doneCount = reservations.filter((r) => r.status === "done").length;

  // 내 예약들
  const myReservations = reservations.filter((r) => r.user_id === user?.id);
  const myNextWaiting = myReservations.find((r) => r.status === "waiting");

  // 현재 처리 중인 순번
  const currentQueueNo = calledReservation?.queue_no ?? doneCount;

  // 예상 대기 시간
  const estimatedMinutes = myNextWaiting
    ? (myNextWaiting.queue_no - currentQueueNo) * (session?.avg_round_minutes || 10)
    : 0;

  // 배럭 로드
  useEffect(() => {
    if (!user) return;
    supabase
      .from("barracks")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order")
      .then(({ data }) => setBarracks(data || []));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // 내 순번 알림
  useEffect(() => {
    if (!myNextWaiting || !currentQueueNo) return;
    const diff = myNextWaiting.queue_no - currentQueueNo;
    if (diff > 0 && diff <= QUEUE_ALERT_BEFORE) {
      toast(`내 순번까지 ${diff}명 남았습니다! 준비하세요!`, "warning");
    }
  }, [currentQueueNo, myNextWaiting]);

  // 벌크 예약
  const handleReserve = async () => {
    if (selectedBarracks.length === 0) {
      toast("예약할 캐릭터를 선택하세요.", "error");
      return;
    }
    setReserving(true);
    const { error } = await supabase.rpc("reserve_bulk", {
      p_session_id: sessionId,
      p_user_id: user!.id,
      p_char_names: selectedBarracks,
    });
    if (error) {
      toast("예약 실패: " + error.message, "error");
    } else {
      toast(`${selectedBarracks.length}개 캐릭터 예약 완료!`, "success");
      setSelectedBarracks([]);
      setShowReservePanel(false);
    }
    setReserving(false);
  };

  // 기사: 다음 호출
  const handleCallNext = async () => {
    // 현재 called를 done으로
    if (calledReservation) {
      await supabase
        .from("reservations")
        .update({ status: "done" })
        .eq("id", calledReservation.id);
    }
    // 다음 waiting을 called로
    const next = waitingReservations[0];
    if (next) {
      await supabase
        .from("reservations")
        .update({ status: "called" })
        .eq("id", next.id);
    }
    refetch();
  };

  // 기사: 노쇼 처리
  const handleNoshow = async (reservationId: string) => {
    const { error } = await supabase.rpc("mark_noshow", {
      p_reservation_id: reservationId,
      p_penalty: NOSHOW_PENALTY_SCORE,
    });
    if (error) toast("노쇼 처리 실패: " + error.message, "error");
    else toast("노쇼 처리 완료", "warning");
    refetch();
  };

  // 기사: 세션 상태 변경
  const handleSessionStatus = async (status: "running" | "completed" | "cancelled") => {
    await supabase
      .from("bus_sessions")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    refetch();
  };

  // 기사: 라운드 진행
  const handleNextRound = async () => {
    if (!session) return;
    await supabase
      .from("bus_sessions")
      .update({ round: session.round + 1, updated_at: new Date().toISOString() })
      .eq("id", sessionId);
    refetch();
  };

  // 닉네임 복사
  const copyNickname = (name: string) => {
    navigator.clipboard.writeText(name);
    toast(`"${name}" 복사됨!`, "info");
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20 text-gbus-text-muted">로딩 중...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20 text-gbus-text-muted">세션을 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 세션 헤더 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">{session.title}</h1>
              <Badge variant={statusVariant[session.status]}>{statusLabel[session.status]}</Badge>
            </div>
            <p className="text-gbus-text-muted">{session.dungeon_name}</p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${session.current_count >= session.min_count ? "text-gbus-success" : "text-gbus-text"}`}>
              {session.current_count}<span className="text-sm text-gbus-text-dim">/{session.min_count}</span>
            </div>
            <div className="text-xs text-gbus-text-dim">라운드 {session.round}</div>
          </div>
        </div>

        {/* 수익 구간 알림 */}
        {session.current_count >= session.min_count && session.status === "waiting" && (
          <div className="bg-gbus-success/10 border border-gbus-success/30 rounded-lg p-3 mb-4 text-sm text-gbus-success text-center">
            수익 구간 진입! {session.current_count}명이 대기 중입니다.
          </div>
        )}

        {/* 기사 컨트롤 */}
        {isDriver && (
          <Card className="mb-6">
            <h3 className="font-semibold mb-3">기사 컨트롤</h3>
            <div className="flex flex-wrap gap-2">
              {session.status === "waiting" && (
                <Button onClick={() => handleSessionStatus("running")}>운행 시작</Button>
              )}
              {session.status === "running" && (
                <>
                  <Button onClick={handleCallNext}>
                    다음 호출 {waitingReservations.length > 0 && `(#${waitingReservations[0].queue_no})`}
                  </Button>
                  <Button variant="secondary" onClick={handleNextRound}>
                    라운드 {session.round + 1} 진행
                  </Button>
                  <Button variant="secondary" onClick={() => handleSessionStatus("completed")}>
                    운행 종료
                  </Button>
                </>
              )}
              {(session.status === "waiting" || session.status === "running") && (
                <Button variant="danger" onClick={() => handleSessionStatus("cancelled")}>
                  취소
                </Button>
              )}
            </div>

            {/* 현재 호출 중 */}
            {calledReservation && (
              <div className="mt-4 bg-gbus-accent/10 border border-gbus-accent/30 rounded-lg p-3">
                <div className="text-xs text-gbus-accent mb-1">현재 호출</div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => copyNickname(calledReservation.char_name)}
                    className="text-lg font-bold text-gbus-accent hover:underline cursor-pointer"
                  >
                    #{calledReservation.queue_no} {calledReservation.char_name}
                  </button>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => copyNickname(calledReservation.char_name)}>
                      복사
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleNoshow(calledReservation.id)}>
                      노쇼
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 승객: 예약 패널 */}
        {!isDriver && profile?.verified && (session.status === "waiting" || session.status === "running") && (
          <Card className="mb-6">
            {!showReservePanel ? (
              <Button onClick={() => setShowReservePanel(true)} className="w-full">
                예약하기
              </Button>
            ) : (
              <div>
                <h3 className="font-semibold mb-3">캐릭터 선택 (배럭)</h3>
                {barracks.length === 0 ? (
                  <p className="text-sm text-gbus-text-muted mb-3">
                    등록된 배럭이 없습니다.{" "}
                    <a href="/barrack" className="text-gbus-primary hover:underline">배럭 관리</a>에서 캐릭터를 추가하세요.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                    {barracks.map((b) => {
                      const alreadyReserved = reservations.some(
                        (r) => r.char_name === b.char_name && r.user_id === user?.id
                      );
                      const selected = selectedBarracks.includes(b.char_name);
                      return (
                        <button
                          key={b.id}
                          disabled={alreadyReserved}
                          onClick={() =>
                            setSelectedBarracks((prev) =>
                              selected
                                ? prev.filter((n) => n !== b.char_name)
                                : [...prev, b.char_name]
                            )
                          }
                          className={`px-3 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${
                            alreadyReserved
                              ? "bg-gbus-bg border-gbus-border text-gbus-text-dim cursor-not-allowed"
                              : selected
                              ? "bg-gbus-primary/20 border-gbus-primary text-gbus-primary-light"
                              : "bg-gbus-surface border-gbus-border text-gbus-text hover:border-gbus-primary"
                          }`}
                        >
                          {b.char_name}
                          {alreadyReserved && " (예약됨)"}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleReserve}
                    loading={reserving}
                    disabled={selectedBarracks.length === 0}
                    className="flex-1"
                  >
                    {selectedBarracks.length}개 캐릭터 예약
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowReservePanel(false); setSelectedBarracks([]); }}>
                    취소
                  </Button>
                </div>
              </div>
            )}

            {/* 내 대기 정보 */}
            {myNextWaiting && (
              <div className="mt-4 bg-gbus-bg rounded-lg p-3 text-sm">
                <span className="text-gbus-text-dim">내 다음 순번:</span>{" "}
                <span className="font-medium">#{myNextWaiting.queue_no} ({myNextWaiting.char_name})</span>
                <span className="text-gbus-text-dim ml-2">| 예상 대기: ~{estimatedMinutes}분</span>
              </div>
            )}
          </Card>
        )}

        {/* 대기열 보드 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">대기열 ({reservations.length}명)</h3>
            <div className="flex gap-3 text-xs text-gbus-text-dim">
              <span>완료: {doneCount}</span>
              <span>대기: {waitingReservations.length}</span>
            </div>
          </div>

          {reservations.length === 0 ? (
            <p className="text-center py-6 text-gbus-text-muted">아직 예약이 없습니다.</p>
          ) : (
            <div className="space-y-1">
              {reservations.map((r) => {
                const isMine = r.user_id === user?.id;
                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                      r.status === "called"
                        ? "bg-gbus-accent/10 border border-gbus-accent/30"
                        : r.status === "done"
                        ? "bg-gbus-bg text-gbus-text-dim"
                        : r.status === "noshow"
                        ? "bg-gbus-danger/5 text-gbus-text-dim line-through"
                        : isMine
                        ? "bg-gbus-primary/5 border border-gbus-primary/20"
                        : "bg-gbus-surface-light"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gbus-text-dim w-8">#{r.queue_no}</span>
                      <button
                        onClick={() => copyNickname(r.char_name)}
                        className="hover:text-gbus-primary transition-colors cursor-pointer"
                        title="클릭하여 복사"
                      >
                        {r.char_name}
                      </button>
                      {isMine && <Badge variant="accent">나</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === "called" && <Badge variant="accent">호출됨</Badge>}
                      {r.status === "done" && <Badge variant="success">완료</Badge>}
                      {r.status === "noshow" && <Badge variant="danger">노쇼</Badge>}
                      {r.status === "waiting" && isDriver && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyNickname(r.char_name)}
                        >
                          복사
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 대기 중 광고 */}
        <PromoCard placement="waiting" className="mt-6" />
      </main>
    </div>
  );
}
