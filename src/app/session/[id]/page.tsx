"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeQueue } from "@/lib/hooks/useRealtimeQueue";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast, ToastContainer } from "@/components/ui/Toast";
import { PromoCard } from "@/components/ads/PromoCard";
import { QUEUE_ALERT_BEFORE, NOSHOW_PENALTY_SCORE, POST_TYPE_LABEL, POSITIONS, type Position } from "@/lib/constants";
import type { Barrack, Bid } from "@/lib/types";

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
  const [bids, setBids] = useState<(Bid & { driver: { nickname: string; game_nickname: string } })[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<Position[]>([]);
  const [bidPrice, setBidPrice] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [bidding, setBidding] = useState(false);
  const supabase = createClient();

  const isDriver = session?.driver_id === user?.id;
  const isParty = session?.post_type === "party";

  const togglePosition = (pos: Position) => {
    setSelectedPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
  };
  const waitingReservations = reservations.filter((r) => r.status === "waiting");
  const calledReservation = reservations.find((r) => r.status === "called");
  const doneCount = reservations.filter((r) => r.status === "done").length;
  const myReservations = reservations.filter((r) => r.user_id === user?.id);
  const myNextWaiting = myReservations.find((r) => r.status === "waiting");
  const currentQueueNo = calledReservation?.queue_no ?? doneCount;
  const estimatedMinutes = myNextWaiting
    ? (myNextWaiting.queue_no - currentQueueNo) * (session?.avg_round_minutes || 10) : 0;
  const totalTarget = session?.post_type === "party" ? (session?.party_size || session?.min_count) : session?.min_count;
  const progress = totalTarget ? Math.min(100, ((session?.current_count || 0) / totalTarget) * 100) : 0;

  useEffect(() => {
    if (!user) return;
    supabase.from("barracks").select("*").eq("user_id", user.id).order("sort_order")
      .then(({ data }) => setBarracks(data || []));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (session?.price_type !== "auction") return;
    supabase.from("bids").select("*, driver:users!bids_driver_id_fkey(nickname, game_nickname)")
      .eq("session_id", sessionId).order("price_t", { ascending: true })
      .then(({ data }) => setBids((data as typeof bids) || []));
  }, [session?.price_type, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBid = async () => {
    if (!bidPrice) { toast("가격을 입력하세요.", "error"); return; }
    setBidding(true);
    const { error } = await supabase.from("bids").insert({
      session_id: sessionId, driver_id: user!.id, price_t: Number(bidPrice), message: bidMessage.trim() || null,
    });
    if (error) {
      toast(error.message.includes("duplicate") ? "이미 입찰했습니다." : "입찰 실패: " + error.message, "error");
    } else {
      toast("입찰 완료!", "success"); setBidPrice(""); setBidMessage("");
      const { data } = await supabase.from("bids").select("*, driver:users!bids_driver_id_fkey(nickname, game_nickname)")
        .eq("session_id", sessionId).order("price_t", { ascending: true });
      setBids((data as typeof bids) || []);
    }
    setBidding(false);
  };

  const handleBidAction = async (bidId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("bids").update({ status }).eq("id", bidId);
    if (error) { toast("처리 실패: " + error.message, "error"); return; }
    toast(status === "accepted" ? "입찰을 수락했습니다!" : "입찰을 거절했습니다.", status === "accepted" ? "success" : "info");
    const { data } = await supabase.from("bids").select("*, driver:users!bids_driver_id_fkey(nickname, game_nickname)")
      .eq("session_id", sessionId).order("price_t", { ascending: true });
    setBids((data as typeof bids) || []);
  };

  useEffect(() => {
    if (!myNextWaiting || !currentQueueNo) return;
    const diff = myNextWaiting.queue_no - currentQueueNo;
    if (diff > 0 && diff <= QUEUE_ALERT_BEFORE) toast(`내 순번까지 ${diff}명 남았습니다!`, "warning");
  }, [currentQueueNo, myNextWaiting]);

  const handleReserve = async () => {
    if (selectedBarracks.length === 0) { toast("예약할 캐릭터를 선택하세요.", "error"); return; }
    setReserving(true);
    const rpcParams: Record<string, unknown> = {
      p_session_id: sessionId,
      p_user_id: user!.id,
      p_char_names: selectedBarracks,
    };
    if (isParty && selectedPositions.length > 0) {
      rpcParams.p_positions = selectedPositions;
    }
    const { error } = await supabase.rpc("reserve_bulk", rpcParams);
    if (error) toast("예약 실패: " + error.message, "error");
    else { toast(`${selectedBarracks.length}개 캐릭터 예약 완료!`, "success"); setSelectedBarracks([]); setSelectedPositions([]); setShowReservePanel(false); }
    setReserving(false);
  };

  const handleCallNext = async () => {
    if (calledReservation) await supabase.from("reservations").update({ status: "done" }).eq("id", calledReservation.id);
    const next = waitingReservations[0];
    if (next) await supabase.from("reservations").update({ status: "called" }).eq("id", next.id);
    refetch();
  };

  const handleNoshow = async (reservationId: string) => {
    const { error } = await supabase.rpc("mark_noshow", { p_reservation_id: reservationId, p_penalty: NOSHOW_PENALTY_SCORE });
    if (error) toast("노쇼 처리 실패: " + error.message, "error");
    else toast("노쇼 처리 완료", "warning");
    refetch();
  };

  const handleSessionStatus = async (status: "running" | "completed" | "cancelled") => {
    await supabase.from("bus_sessions").update({ status, updated_at: new Date().toISOString() }).eq("id", sessionId);
    refetch();
  };

  const handleNextRound = async () => {
    if (!session) return;
    await supabase.from("bus_sessions").update({ round: session.round + 1, updated_at: new Date().toISOString() }).eq("id", sessionId);
    refetch();
  };

  const copyNickname = (name: string) => { navigator.clipboard.writeText(name); toast(`"${name}" 복사됨!`, "info"); };

  if (loading) return (
    <div className="min-h-screen"><Header />
      <div className="flex items-center justify-center py-20"><div className="w-10 h-10 rounded-full border-2 border-gbus-primary border-t-transparent animate-spin" /></div>
    </div>
  );

  if (!session) return (
    <div className="min-h-screen"><Header />
      <div className="flex flex-col items-center justify-center py-20"><div className="text-5xl mb-4 opacity-20">&#x1F50D;</div><p className="text-gbus-text-muted">세션을 찾을 수 없습니다.</p></div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-4xl mx-auto px-4 py-8 animate-fade-up">
        {/* 세션 헤더 */}
        <div className="glass rounded-2xl p-6 mb-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant={session.post_type === "barrack_bus" ? "success" : session.post_type === "bus" ? "accent" : "default"}>
                  {POST_TYPE_LABEL[session.post_type]}
                </Badge>
                {session.price_type === "auction" && <Badge variant="warning">역경매</Badge>}
                <div className="flex items-center gap-1.5">
                  {session.status === "running" && <span className="status-dot status-dot-live" />}
                  <Badge variant={statusVariant[session.status]}>{statusLabel[session.status]}</Badge>
                </div>
              </div>
              <h1 className="text-2xl font-bold">{session.title}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-gbus-text-muted flex-wrap">
                <span>{session.dungeon_name.replace(/,/g, " ")}</span>
                {session.price_t != null && session.price_type !== "auction" && (
                  <span className="text-gbus-accent font-bold">{session.price_t}T</span>
                )}
                {session.price_type === "auction" && session.price_t != null && (
                  <span className="text-gbus-warning font-medium">희망 {session.price_t}T</span>
                )}
                {session.scheduled_start && (
                  <span>시작: {new Date(session.scheduled_start).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                )}
              </div>
            </div>

            {/* 카운터 */}
            <div className="text-center bg-gbus-bg/40 rounded-2xl px-6 py-4 border border-gbus-border/20 ml-4">
              <div className={`text-4xl font-black ${(session.current_count || 0) >= (totalTarget || 1) ? "text-gbus-success animate-count-pulse" : "text-gbus-text"}`}>
                {session.current_count}
              </div>
              <div className="text-xs text-gbus-text-dim mt-0.5">/ {totalTarget}명</div>
              <div className="text-xs text-gbus-primary-light font-medium mt-1">R{session.round}</div>
            </div>
          </div>

          {/* 프로그레스 */}
          <div className="mt-4 progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* 수익 구간 */}
        {(session.current_count || 0) >= (totalTarget || 1) && session.status === "waiting" && (
          <div className="glass rounded-2xl p-4 mb-5 text-center border border-gbus-success/20">
            <span className="text-gbus-success font-bold">수익 구간 진입!</span>
            <span className="text-gbus-text-muted ml-2">{session.current_count}명 대기 중</span>
          </div>
        )}

        {/* 기사/파장 컨트롤 */}
        {isDriver && (
          <div className="glass rounded-2xl p-6 mb-5">
            <h3 className="font-bold mb-4 flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-gbus-accent rounded-full" />{isParty ? "파장 컨트롤" : "기사 컨트롤"}
            </h3>
            <div className="flex flex-wrap gap-2">
              {session.status === "waiting" && <Button onClick={() => handleSessionStatus("running")} className="btn-shine">{isParty ? "모집 마감" : "운행 시작"}</Button>}
              {session.status === "running" && (
                <>
                  {!isParty && (
                    <Button variant="accent" onClick={handleCallNext} className="btn-shine">
                      다음 호출 {waitingReservations.length > 0 && `(#${waitingReservations[0].queue_no})`}
                    </Button>
                  )}
                  {!isParty && <Button variant="secondary" onClick={handleNextRound}>R{session.round + 1} 진행</Button>}
                  <Button variant="secondary" onClick={() => handleSessionStatus("completed")}>{isParty ? "파티 완료" : "운행 종료"}</Button>
                </>
              )}
              {(session.status === "waiting" || session.status === "running") && (
                <Button variant="danger" onClick={() => handleSessionStatus("cancelled")}>취소</Button>
              )}
            </div>

            {!isParty && calledReservation && (
              <div className="mt-4 bg-gbus-accent/8 border border-gbus-accent/20 rounded-xl p-4">
                <div className="text-xs text-gbus-accent mb-1.5 font-bold uppercase tracking-wider">현재 호출</div>
                <div className="flex items-center justify-between">
                  <button onClick={() => copyNickname(calledReservation.char_name)}
                    className="text-xl font-black text-gbus-accent hover:text-gbus-accent-light transition-colors cursor-pointer">
                    #{calledReservation.queue_no} {calledReservation.char_name}
                  </button>
                  <div className="flex gap-2">
                    <Button size="sm" variant="accent" onClick={() => copyNickname(calledReservation.char_name)}>복사</Button>
                    <Button variant="danger" size="sm" onClick={() => handleNoshow(calledReservation.id)}>노쇼</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 승객 예약 */}
        {!isDriver && profile?.verified && (session.status === "waiting" || session.status === "running") && (
          <div className="glass rounded-2xl p-6 mb-5">
            {!showReservePanel ? (
              <Button onClick={() => setShowReservePanel(true)} className="w-full btn-shine" size="lg">예약하기</Button>
            ) : (
              <div>
                <h3 className="font-bold mb-4 flex items-center gap-2.5">
                  <span className="w-1.5 h-4 bg-gbus-primary rounded-full" />캐릭터 선택
                </h3>
                {barracks.length === 0 ? (
                  <p className="text-sm text-gbus-text-muted mb-3">
                    등록된 배럭이 없습니다. <a href="/barrack" className="text-gbus-primary hover:text-gbus-primary-light transition-colors font-medium">배럭 관리</a>에서 추가하세요.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                    {barracks.map((b) => {
                      const done = reservations.some((r) => r.char_name === b.char_name && r.user_id === user?.id);
                      const sel = selectedBarracks.includes(b.char_name);
                      return (
                        <button key={b.id} disabled={done} onClick={() => setSelectedBarracks((p) => sel ? p.filter((n) => n !== b.char_name) : [...p, b.char_name])}
                          className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer text-left ${
                            done ? "bg-gbus-bg/40 border-gbus-border/20 text-gbus-text-dim cursor-not-allowed opacity-40"
                            : sel ? "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-primary-light shadow-[0_0_10px_rgba(108,92,231,0.12)]"
                            : "border-gbus-border/40 text-gbus-text-muted hover:border-gbus-primary/30 hover:text-gbus-text"
                          }`}>
                          <span>{b.char_name}{done && " (예약됨)"}</span>
                          {(b.tamer_lv != null || b.digi_lv != null) && (
                            <span className="flex items-center gap-1.5 mt-0.5">
                              {b.tamer_lv != null && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-gbus-accent">
                                  <span className="w-1.5 h-1.5 rounded-sm bg-gbus-accent/80" />{b.tamer_lv}
                                </span>
                              )}
                              {b.digi_lv != null && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-gbus-warning">
                                  <span className="w-1.5 h-1.5 rounded-sm bg-gbus-warning/80" />{b.digi_lv}
                                </span>
                              )}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* 포지션 선택 (파티만) */}
                {isParty && (
                  <div className="mb-4">
                    <label className="text-sm font-semibold text-gbus-text-muted block mb-2.5">
                      포지션 <span className="text-gbus-text-dim font-normal">(미선택 = 올포지션)</span>
                    </label>
                    <div className="flex gap-2">
                      {(Object.entries(POSITIONS) as [Position, typeof POSITIONS[Position]][]).map(([key, { label, color }]) => {
                        const sel = selectedPositions.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => togglePosition(key)}
                            className={`flex-1 py-2.5 text-sm rounded-xl transition-all duration-300 cursor-pointer border font-semibold ${
                              sel
                                ? color === "danger"
                                  ? "bg-gbus-danger/15 border-gbus-danger/40 text-gbus-danger shadow-[0_0_12px_rgba(255,118,117,0.15)]"
                                  : color === "accent"
                                    ? "bg-gbus-accent/15 border-gbus-accent/40 text-gbus-accent shadow-[0_0_12px_rgba(0,206,201,0.15)]"
                                    : "bg-gbus-success/15 border-gbus-success/40 text-gbus-success shadow-[0_0_12px_rgba(0,184,148,0.15)]"
                                : "border-gbus-border/40 text-gbus-text-dim hover:border-gbus-text-dim hover:text-gbus-text-muted"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {selectedPositions.length === 0 && (
                      <p className="text-xs text-gbus-primary-light mt-2 font-medium">올포지션으로 참여합니다</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleReserve} loading={reserving} disabled={selectedBarracks.length === 0} className="flex-1 btn-shine">
                    {selectedBarracks.length}개 예약
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowReservePanel(false); setSelectedBarracks([]); setSelectedPositions([]); }}>취소</Button>
                </div>
              </div>
            )}
            {myNextWaiting && (
              <div className="mt-4 bg-gbus-bg/40 rounded-xl p-4 text-sm border border-gbus-border/20">
                <span className="text-gbus-text-dim">내 순번:</span>{" "}
                <span className="font-bold text-gbus-primary-light">#{myNextWaiting.queue_no}</span>
                <span className="text-gbus-text-dim ml-1">({myNextWaiting.char_name})</span>
                <span className="text-gbus-text-dim ml-3">| ~{estimatedMinutes}분</span>
              </div>
            )}
          </div>
        )}

        {/* 역경매 */}
        {session.price_type === "auction" && (
          <div className="glass rounded-2xl p-6 mb-5">
            <h3 className="font-bold mb-4 flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-gbus-warning rounded-full" />역경매 ({bids.length}건)
            </h3>
            {bids.length > 0 ? (
              <div className="space-y-2 mb-4">
                {bids.map((b) => (
                  <div key={b.id} className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm ${
                    b.status === "accepted" ? "bg-gbus-success/8 border border-gbus-success/20"
                    : b.status === "rejected" ? "bg-gbus-bg/40 text-gbus-text-dim line-through border border-gbus-border/10 opacity-50"
                    : "bg-gbus-surface-light/30 border border-gbus-border/20"
                  }`}>
                    <div>
                      <span className="font-semibold">{b.driver?.game_nickname || b.driver?.nickname}</span>
                      <span className="text-gbus-accent font-black ml-2">{b.price_t}T</span>
                      {b.message && <span className="text-gbus-text-dim ml-2 text-xs">- {b.message}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {b.status === "accepted" && <Badge variant="success">수락</Badge>}
                      {b.status === "rejected" && <Badge variant="danger">거절</Badge>}
                      {b.status === "pending" && isDriver && (<><Button size="sm" onClick={() => handleBidAction(b.id, "accepted")}>수락</Button><Button variant="ghost" size="sm" onClick={() => handleBidAction(b.id, "rejected")}>거절</Button></>)}
                      {b.status === "pending" && b.driver_id === user?.id && <Badge variant="warning">대기</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (<p className="text-sm text-gbus-text-muted mb-4">아직 입찰이 없습니다.</p>)}

            {!isDriver && profile?.verified && !bids.some((b) => b.driver_id === user?.id) && (
              <div className="border-t border-gbus-border/20 pt-4 flex flex-col gap-2">
                <div className="flex gap-2">
                  <input type="number" min={0} value={bidPrice} onChange={(e) => setBidPrice(e.target.value)} placeholder="제안 가격 (T)"
                    className="flex-1 px-4 py-2.5 bg-gbus-bg/40 border border-gbus-border/40 rounded-xl text-sm text-gbus-text placeholder:text-gbus-text-dim focus:outline-none focus:border-gbus-primary focus:ring-2 focus:ring-gbus-primary/15 transition-all" />
                  <Button onClick={handleBid} loading={bidding} disabled={!bidPrice}>입찰</Button>
                </div>
                <input type="text" value={bidMessage} onChange={(e) => setBidMessage(e.target.value)} placeholder="한마디 (선택)"
                  className="px-4 py-2.5 bg-gbus-bg/40 border border-gbus-border/40 rounded-xl text-sm text-gbus-text placeholder:text-gbus-text-dim focus:outline-none focus:border-gbus-primary focus:ring-2 focus:ring-gbus-primary/15 transition-all" />
              </div>
            )}
          </div>
        )}

        {/* 대기열 보드 */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-gbus-primary rounded-full" />{isParty ? "참여자" : "대기열"} ({reservations.length}명)
            </h3>
            <div className="flex gap-4 text-xs font-medium">
              {isParty ? (
                <>
                  {(Object.entries(POSITIONS) as [Position, typeof POSITIONS[Position]][]).map(([key, { label }]) => {
                    const count = reservations.filter((r) => r.positions?.includes(key)).length;
                    return count > 0 ? <span key={key} className="text-gbus-text-muted">{label} {count}</span> : null;
                  })}
                  {(() => {
                    const allPosCount = reservations.filter((r) => !r.positions || r.positions.length === 0).length;
                    return allPosCount > 0 ? <span className="text-gbus-primary-light">올포지션 {allPosCount}</span> : null;
                  })()}
                </>
              ) : (
                <>
                  <span className="text-gbus-success">완료 {doneCount}</span>
                  <span className="text-gbus-text-dim">대기 {waitingReservations.length}</span>
                </>
              )}
            </div>
          </div>

          {reservations.length === 0 ? (
            <div className="text-center py-12"><div className="text-4xl mb-3 opacity-15">&#x1F465;</div><p className="text-gbus-text-muted text-sm">예약이 없습니다</p></div>
          ) : (
            <div className="space-y-1.5">
              {reservations.map((r) => {
                const mine = r.user_id === user?.id;
                return (
                  <div key={r.id} className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                    r.status === "called" ? "bg-gbus-accent/8 border border-gbus-accent/20 shadow-[0_0_16px_rgba(0,206,201,0.06)]"
                    : r.status === "done" ? "bg-gbus-bg/30 text-gbus-text-dim"
                    : r.status === "noshow" ? "bg-gbus-danger/5 text-gbus-text-dim line-through opacity-40"
                    : mine ? "bg-gbus-primary/6 border border-gbus-primary/15"
                    : "bg-gbus-surface-light/20 border border-transparent hover:bg-gbus-surface-light/30"
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-gbus-text-dim w-8 font-mono text-xs font-medium">#{r.queue_no}</span>
                      <button onClick={() => copyNickname(r.char_name)} className="hover:text-gbus-primary-light transition-colors cursor-pointer font-semibold" title="복사">
                        {r.char_name}
                      </button>
                      {mine && <Badge variant="primary">나</Badge>}
                      {isParty && (r.positions && r.positions.length > 0
                        ? r.positions.map((pos) => {
                            const p = POSITIONS[pos as Position];
                            return p ? <Badge key={pos} variant={p.color}>{p.label}</Badge> : null;
                          })
                        : <Badge variant="primary">올포지션</Badge>
                      )}
                      {(r.tamer_lv != null || r.digi_lv != null) && (
                        <span className="flex items-center gap-1 ml-1">
                          {r.tamer_lv != null && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gbus-accent">
                              <span className="w-1.5 h-1.5 rounded-sm bg-gbus-accent/80" />{r.tamer_lv}
                            </span>
                          )}
                          {r.digi_lv != null && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gbus-warning">
                              <span className="w-1.5 h-1.5 rounded-sm bg-gbus-warning/80" />{r.digi_lv}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === "called" && <Badge variant="accent">호출됨</Badge>}
                      {r.status === "done" && <Badge variant="success">완료</Badge>}
                      {r.status === "noshow" && <Badge variant="danger">노쇼</Badge>}
                      {r.status === "waiting" && isDriver && !isParty && <Button variant="ghost" size="sm" onClick={() => copyNickname(r.char_name)}>복사</Button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <PromoCard placement="waiting" className="mt-6" />
      </main>
    </div>
  );
}
