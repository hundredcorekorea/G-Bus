"use client";

import { useEffect, useState, useRef, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeQueue } from "@/lib/hooks/useRealtimeQueue";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast, ToastContainer } from "@/components/ui/Toast";
import { PromoCard } from "@/components/ads/PromoCard";
import { ReportModal } from "@/components/ui/ReportModal";
import { QUEUE_ALERT_BEFORE, NOSHOW_PENALTY_SCORE, POST_TYPE_LABEL, POSITIONS, DUNGEONS, getAnonymousName, type Position } from "@/lib/constants";
import { sendNotification, sendPushToUser } from "@/lib/notifications";
import type { Barrack, Bid, SessionDriver, DriverApplication } from "@/lib/types";

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
  const [posFilter, setPosFilter] = useState<Position | "all">("all");
  const [bidPrice, setBidPrice] = useState("");
  const [bidMessage, setBidMessage] = useState("");
  const [bidding, setBidding] = useState(false);
  const [editingBidId, setEditingBidId] = useState<string | null>(null);
  const [editBidPrice, setEditBidPrice] = useState("");
  const [editBidMessage, setEditBidMessage] = useState("");
  const [reportTarget, setReportTarget] = useState<{ userId: string; name: string } | null>(null);
  const [sessionDrivers, setSessionDrivers] = useState<(SessionDriver & { user: { nickname: string; game_nickname: string } })[]>([]);
  const [subDriverNick, setSubDriverNick] = useState("");
  const [addingSubDriver, setAddingSubDriver] = useState(false);
  // mass_bus 전용
  const [driverApps, setDriverApps] = useState<(DriverApplication & { driver: { nickname: string; game_nickname: string } })[]>([]);
  const [driverAppMsg, setDriverAppMsg] = useState("");
  const [applyingDriver, setApplyingDriver] = useState(false);
  const supabase = createClient();

  const isMassBus = session?.post_type === "mass_bus";
  const isHost = isMassBus && session?.host_user_id === user?.id;
  const isMainDriver = session?.driver_id === user?.id;
  const isSubDriver = sessionDrivers.some((d) => d.user_id === user?.id && d.role === "sub");
  const isDriver = isMainDriver || isSubDriver;
  const isParty = session?.post_type === "party" || session?.post_type === "field_party";
  // mass_bus에서는 호스트 또는 기사가 컨트롤 가능
  const canControl = isMassBus ? (isHost || isDriver) : isDriver;

  const togglePosition = (pos: Position) => {
    setSelectedPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
  };
  const activeReservations = reservations.filter((r) => r.status !== "pending");
  const pendingReservations = reservations.filter((r) => r.status === "pending");
  const waitingReservations = activeReservations.filter((r) => r.status === "waiting");
  const calledReservation = activeReservations.find((r) => r.status === "called");
  const doneCount = activeReservations.filter((r) => r.status === "done").length;
  const myReservations = reservations.filter((r) => r.user_id === user?.id);
  const myPending = myReservations.filter((r) => r.status === "pending");
  const myNextWaiting = myReservations.find((r) => r.status === "waiting");
  const dungeonNames = session?.dungeon_name?.split(",").map((s: string) => s.trim()) || [];
  const minDigiLv = Math.max(0, ...dungeonNames.map((dn: string) => DUNGEONS.find((d) => d.name === dn)?.minDigiLv ?? 0));
  const currentQueueNo = calledReservation?.queue_no ?? doneCount;
  const estimatedMinutes = myNextWaiting
    ? (myNextWaiting.queue_no - currentQueueNo) * (session?.avg_round_minutes || 10) : 0;
  const totalTarget = isParty ? (session?.party_size || session?.min_count) : session?.min_count;
  const progress = totalTarget ? Math.min(100, ((session?.current_count || 0) / totalTarget) * 100) : 0;
  // mass_bus: 필수 인원 충족 여부
  const massBusMinMet = isMassBus && (session?.current_count || 0) >= (session?.min_count || 0);
  // 내 기사 신청 여부
  const myDriverApp = driverApps.find((a) => a.driver_id === user?.id);
  // 수락된 기사
  const acceptedDriverApp = driverApps.find((a) => a.status === "accepted");

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

  // 보조기사 목록 로딩
  const fetchDrivers = async () => {
    const { data } = await supabase
      .from("session_drivers")
      .select("*, user:users!session_drivers_user_id_fkey(nickname, game_nickname)")
      .eq("session_id", sessionId);
    setSessionDrivers((data as typeof sessionDrivers) || []);
  };
  useEffect(() => { fetchDrivers(); }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // mass_bus: 기사 신청 목록 로딩
  const fetchDriverApps = async () => {
    const { data } = await supabase
      .from("driver_applications")
      .select("*, driver:users!driver_applications_driver_id_fkey(nickname, game_nickname)")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    setDriverApps((data as typeof driverApps) || []);
  };
  useEffect(() => {
    if (isMassBus || session?.post_type === "mass_bus") fetchDriverApps();
  }, [sessionId, session?.post_type]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddSubDriver = async () => {
    if (!subDriverNick.trim()) return;
    setAddingSubDriver(true);
    const { data: found } = await supabase
      .from("users")
      .select("id")
      .eq("game_nickname", subDriverNick.trim())
      .maybeSingle();
    if (!found) {
      toast("해당 인게임 닉네임의 유저를 찾을 수 없습니다.", "error");
      setAddingSubDriver(false);
      return;
    }
    const { error } = await supabase.from("session_drivers").insert({
      session_id: sessionId, user_id: found.id, role: "sub",
    });
    if (error) {
      toast(error.message.includes("duplicate") ? "이미 등록된 기사입니다." : "추가 실패: " + error.message, "error");
    } else {
      toast("보조기사가 추가되었습니다!", "success");
      setSubDriverNick("");
    }
    setAddingSubDriver(false);
    fetchDrivers();
  };

  const handleRemoveSubDriver = async (driverId: string) => {
    await supabase.from("session_drivers").delete().eq("id", driverId);
    toast("보조기사가 제거되었습니다.", "info");
    fetchDrivers();
  };

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
      refreshBids();
    }
    setBidding(false);
  };

  const refreshBids = async () => {
    const { data } = await supabase.from("bids").select("*, driver:users!bids_driver_id_fkey(nickname, game_nickname)")
      .eq("session_id", sessionId).order("price_t", { ascending: true });
    setBids((data as typeof bids) || []);
  };

  const handleBidEdit = async () => {
    if (!editingBidId || !editBidPrice) { toast("가격을 입력하세요.", "error"); return; }
    setBidding(true);
    const { error } = await supabase.from("bids").update({
      price_t: Number(editBidPrice), message: editBidMessage.trim() || null,
    }).eq("id", editingBidId);
    if (error) toast("수정 실패: " + error.message, "error");
    else { toast("입찰이 수정되었습니다!", "success"); setEditingBidId(null); }
    setBidding(false);
    refreshBids();
  };

  const handleBidCancel = async (bidId: string) => {
    const { error, count } = await supabase.from("bids").delete({ count: "exact" }).eq("id", bidId);
    if (error) { toast("취소 실패: " + error.message, "error"); return; }
    if (count === 0) { toast("취소 권한이 없거나 이미 처리된 입찰입니다.", "error"); return; }
    toast("입찰이 취소되었습니다.", "info");
    refreshBids();
  };

  const handleBidAction = async (bidId: string, status: "accepted" | "rejected") => {
    const bid = bids.find((b) => b.id === bidId);
    const { error } = await supabase.from("bids").update({ status }).eq("id", bidId);
    if (error) { toast("처리 실패: " + error.message, "error"); return; }
    toast(status === "accepted" ? "입찰을 수락했습니다!" : "입찰을 거절했습니다.", status === "accepted" ? "success" : "info");
    // 입찰 수락 시 기사에게 서버 push
    if (status === "accepted" && bid) {
      sendPushToUser(bid.driver_id, {
        title: "G-BUS - 입찰 수락!",
        body: `${session?.title || "세션"}의 입찰이 수락되었습니다.`,
        tag: `bid-accepted-${sessionId}`,
        url: `/session/${sessionId}`,
      });
    }
    refreshBids();
  };

  useEffect(() => {
    if (!myNextWaiting || !currentQueueNo) return;
    const diff = myNextWaiting.queue_no - currentQueueNo;
    if (diff > 0 && diff <= QUEUE_ALERT_BEFORE) {
      toast(`내 순번까지 ${diff}명 남았습니다!`, "warning");
      sendNotification({
        title: "G-BUS 순번 알림",
        body: `내 순번까지 ${diff}명 남았습니다!`,
        tag: `queue-${sessionId}`,
        onClick: `/session/${sessionId}`,
      });
    }
  }, [currentQueueNo, myNextWaiting]);

  // 내 차례 호출 감지
  const myCalledReservation = reservations.find((r) => r.user_id === user?.id && r.status === "called");
  const prevMyCalledRef = useRef<string | null>(null);
  useEffect(() => {
    if (myCalledReservation && prevMyCalledRef.current !== myCalledReservation.id) {
      toast("내 차례입니다! 준비해주세요!", "success");
      sendNotification({
        title: "G-BUS - 내 차례!",
        body: `${myCalledReservation.char_name} 호출되었습니다. 준비해주세요!`,
        tag: `called-${sessionId}`,
        onClick: `/session/${sessionId}`,
      });
    }
    prevMyCalledRef.current = myCalledReservation?.id ?? null;
  }, [myCalledReservation?.id]);

  // 파티 참여 수락 감지 (pending → waiting)
  const prevMyPendingCountRef = useRef<number>(myPending.length);
  useEffect(() => {
    if (
      isParty &&
      prevMyPendingCountRef.current > 0 &&
      myPending.length < prevMyPendingCountRef.current &&
      myNextWaiting
    ) {
      toast("파티 참여가 수락되었습니다!", "success");
      sendNotification({
        title: "G-BUS - 참여 수락!",
        body: "파장이 참여를 수락했습니다. 대기열에 등록되었습니다.",
        tag: `accepted-${sessionId}`,
        onClick: `/session/${sessionId}`,
      });
    }
    prevMyPendingCountRef.current = myPending.length;
  }, [myPending.length, myNextWaiting?.id]);

  const handleReserve = async () => {
    if (selectedBarracks.length === 0) { toast("예약할 캐릭터를 선택하세요.", "error"); return; }
    setReserving(true);
    const { error } = await supabase.rpc("reserve_bulk", {
      p_session_id: sessionId,
      p_user_id: user!.id,
      p_char_names: selectedBarracks,
      p_positions: selectedPositions.length > 0 ? selectedPositions : null,
      p_status: isParty ? "pending" : "waiting",
    });
    if (error) toast("신청 실패: " + error.message, "error");
    else {
      toast(isParty ? "참여 신청 완료! 파장의 수락을 기다려 주세요." : `${selectedBarracks.length}개 캐릭터 예약 완료!`, "success");
      setSelectedBarracks([]); setSelectedPositions([]); setShowReservePanel(false);
    }
    setReserving(false);
  };

  // mass_bus: 호스트 배럭 캐릭터 등록 (대기열에 바로 추가)
  const handleHostRegisterBarracks = async () => {
    if (selectedBarracks.length === 0) { toast("등록할 캐릭터를 선택하세요.", "error"); return; }
    setReserving(true);
    const { error } = await supabase.rpc("reserve_bulk", {
      p_session_id: sessionId,
      p_user_id: user!.id,
      p_char_names: selectedBarracks,
      p_positions: null,
      p_status: "waiting",
    });
    if (error) toast("등록 실패: " + error.message, "error");
    else {
      toast(`${selectedBarracks.length}개 캐릭터가 대기열에 등록되었습니다!`, "success");
      setSelectedBarracks([]);
    }
    setReserving(false);
  };

  // mass_bus: 호스트가 대기열에서 캐릭터 제거
  const handleHostRemoveChar = async (reservationId: string) => {
    const { error } = await supabase.from("reservations").delete().eq("id", reservationId);
    if (error) { toast("제거 실패: " + error.message, "error"); return; }
    await supabase.from("bus_sessions").update({
      current_count: Math.max(0, (session?.current_count || 1) - 1),
      updated_at: new Date().toISOString(),
    }).eq("id", sessionId);
    toast("캐릭터가 대기열에서 제거되었습니다.", "info");
    refetch();
  };

  // mass_bus: 기사 신청
  const handleApplyDriver = async () => {
    if (!profile?.driver_verified) { toast("기사인증이 필요합니다.", "error"); return; }
    if (!massBusMinMet) { toast("필수 인원이 아직 충족되지 않았습니다.", "error"); return; }
    setApplyingDriver(true);
    const { error } = await supabase.from("driver_applications").insert({
      session_id: sessionId,
      driver_id: user!.id,
      message: driverAppMsg.trim() || null,
    });
    if (error) {
      toast(error.message.includes("duplicate") ? "이미 신청했습니다." : "신청 실패: " + error.message, "error");
    } else {
      toast("기사 신청 완료!", "success");
      setDriverAppMsg("");
    }
    setApplyingDriver(false);
    fetchDriverApps();
  };

  // mass_bus: 호스트가 기사 신청 수락/거절
  const handleDriverAppAction = async (appId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("driver_applications").update({ status }).eq("id", appId);
    if (error) { toast("처리 실패: " + error.message, "error"); return; }
    // 수락 시 session_drivers에도 등록
    if (status === "accepted") {
      const app = driverApps.find((a) => a.id === appId);
      if (app) {
        await supabase.from("session_drivers").insert({
          session_id: sessionId, user_id: app.driver_id, role: "main",
        });
      }
      toast("기사를 수락했습니다!", "success");
      // 수락된 기사에게 서버 push
      if (app) {
        sendPushToUser(app.driver_id, {
          title: "G-BUS - 기사 수락!",
          body: "호스트가 기사 신청을 수락했습니다.",
          tag: `driver-accepted-${sessionId}`,
          url: `/session/${sessionId}`,
        });
      }
      fetchDrivers();
    } else {
      toast("기사 신청을 거절했습니다.", "info");
    }
    fetchDriverApps();
  };

  const handleCallNext = async () => {
    if (calledReservation) await supabase.from("reservations").update({ status: "done" }).eq("id", calledReservation.id);
    const next = waitingReservations[0];
    if (next) {
      await supabase.from("reservations").update({ status: "called" }).eq("id", next.id);
      // 호출된 유저에게 서버 push
      sendPushToUser(next.user_id, {
        title: "G-BUS - 내 차례!",
        body: `${next.char_name} 호출되었습니다. 준비해주세요!`,
        tag: `called-${sessionId}`,
        url: `/session/${sessionId}`,
      });
    }
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

  const handleAccept = async (reservationId: string) => {
    const reservation = reservations.find((r) => r.id === reservationId);
    const { error } = await supabase.rpc("accept_applicant", { p_reservation_id: reservationId });
    if (error) toast("수락 실패: " + error.message, "error");
    else {
      toast("수락 완료!", "success");
      // 수락된 유저에게 서버 push
      if (reservation) {
        sendPushToUser(reservation.user_id, {
          title: "G-BUS - 참여 수락!",
          body: "파장이 참여를 수락했습니다. 대기열에 등록되었습니다.",
          tag: `accepted-${sessionId}`,
          url: `/session/${sessionId}`,
        });
      }
    }
    refetch();
  };

  const handleReject = async (reservationId: string) => {
    const { error } = await supabase.from("reservations").delete().eq("id", reservationId);
    if (error) toast("거절 실패: " + error.message, "error");
    else toast("거절 완료", "info");
    refetch();
  };

  const handleLeave = async (reservationId: string) => {
    const r = reservations.find((rv) => rv.id === reservationId);
    if (!r) return;
    const { error } = await supabase.from("reservations").delete().eq("id", reservationId);
    if (error) { toast("탈퇴 실패: " + error.message, "error"); return; }
    if (r.status !== "pending") {
      await supabase.from("bus_sessions").update({ current_count: Math.max(0, (session?.current_count || 1) - 1), updated_at: new Date().toISOString() }).eq("id", sessionId);
    }
    toast("파티에서 탈퇴했습니다.", "info");
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
                <Badge variant={
                  session.post_type === "field_party" || session.post_type === "barrack_bus" ? "success"
                    : session.post_type === "bus" ? "accent"
                    : session.post_type === "exp_party" ? "warning"
                    : session.post_type === "mass_bus" ? "primary"
                    : "default"
                }>
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

        {/* ===== mass_bus: 파티 호스트 컨트롤 ===== */}
        {isMassBus && isHost && (
          <div className="glass rounded-2xl p-6 mb-5">
            <h3 className="font-bold mb-4 flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-gbus-primary rounded-full" />파티 호스트
            </h3>

            {/* 상태 버튼 */}
            <div className="flex flex-wrap gap-2 mb-4">
              {session.status === "waiting" && <Button onClick={() => handleSessionStatus("running")} className="btn-shine">운행 시작</Button>}
              {session.status === "running" && (
                <>
                  <Button variant="accent" onClick={handleCallNext} className="btn-shine">
                    다음 호출 {waitingReservations.length > 0 && `(#${waitingReservations[0].queue_no})`}
                  </Button>
                  <Button variant="secondary" onClick={handleNextRound}>R{session.round + 1} 진행</Button>
                  <Button variant="secondary" onClick={() => handleSessionStatus("completed")}>운행 종료</Button>
                </>
              )}
              {(session.status === "waiting" || session.status === "running") && (
                <Button variant="danger" onClick={() => handleSessionStatus("cancelled")}>취소</Button>
              )}
            </div>

            {/* 호출 중인 캐릭터 */}
            {calledReservation && (
              <div className="bg-gbus-accent/8 border border-gbus-accent/20 rounded-xl p-4 mb-4">
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

            {/* 배럭 캐릭터 등록/해제 */}
            {session.status === "waiting" && (
              <div className="border-t border-gbus-border/20 pt-4">
                <div className="text-xs font-bold text-gbus-text-muted mb-2.5 uppercase tracking-wider">배럭 캐릭터 대기열 등록</div>
                {barracks.length === 0 ? (
                  <p className="text-sm text-gbus-text-muted">
                    등록된 배럭이 없습니다. <a href="/barrack" className="text-gbus-primary hover:text-gbus-primary-light transition-colors font-medium">배럭 관리</a>에서 추가하세요.
                  </p>
                ) : (
                  <>
                    {minDigiLv > 0 && (
                      <p className="text-xs text-gbus-warning mb-2 font-medium">이 던전은 하인 Lv.{minDigiLv} 이상만 입장 가능합니다</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                      {barracks.map((b) => {
                        const inQueue = reservations.some((r) => r.char_name === b.char_name && r.user_id === user?.id);
                        const lvBlocked = minDigiLv > 0 && (b.digi_lv == null || b.digi_lv < minDigiLv);
                        const disabled = inQueue || lvBlocked;
                        const sel = selectedBarracks.includes(b.char_name);
                        return (
                          <button key={b.id} disabled={disabled} onClick={() => setSelectedBarracks((p) => sel ? p.filter((n) => n !== b.char_name) : [...p, b.char_name])}
                            className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer text-left ${
                              disabled ? "bg-gbus-bg/40 border-gbus-border/20 text-gbus-text-dim cursor-not-allowed opacity-40"
                              : sel ? "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-primary-light shadow-[0_0_10px_rgba(108,92,231,0.12)]"
                              : "border-gbus-border/40 text-gbus-text-muted hover:border-gbus-primary/30 hover:text-gbus-text"
                            }`}>
                            <span>{b.char_name}{inQueue ? " (등록됨)" : lvBlocked ? " (레벨 부족)" : ""}</span>
                            {(b.tamer_lv != null || b.digi_lv != null) && (
                              <span className="flex items-center gap-1 mt-0.5">
                                {b.tamer_lv != null && <span className="inline-flex items-center px-1 py-px rounded text-[9px] font-bold bg-gbus-success/10 text-gbus-success border border-gbus-success/30">{b.tamer_lv}</span>}
                                {b.digi_lv != null && <span className="inline-flex items-center px-1 py-px rounded text-[9px] font-bold bg-gbus-accent-light/10 text-gbus-accent-light border border-gbus-accent-light/30">{b.digi_lv}</span>}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <Button onClick={handleHostRegisterBarracks} loading={reserving} disabled={selectedBarracks.length === 0} size="sm">
                      {selectedBarracks.length}개 대기열 등록
                    </Button>
                  </>
                )}

                {/* 등록된 내 캐릭터 목록 (제거 가능) */}
                {myReservations.filter((r) => r.status === "waiting").length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-bold text-gbus-text-dim mb-1.5">등록된 내 캐릭터</div>
                    <div className="space-y-1">
                      {myReservations.filter((r) => r.status === "waiting").map((r) => (
                        <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gbus-primary/5 border border-gbus-primary/10 text-sm">
                          <span className="font-medium">#{r.queue_no} {r.char_name}</span>
                          <button onClick={() => handleHostRemoveChar(r.id)} className="text-xs text-gbus-danger/70 hover:text-gbus-danger transition-colors">&times; 제거</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 기사 신청 관리 */}
            <div className="border-t border-gbus-border/20 pt-4 mt-4">
              <div className="text-xs font-bold text-gbus-text-muted mb-2.5 uppercase tracking-wider">
                기사 신청 ({driverApps.length}건)
                {acceptedDriverApp && <span className="text-gbus-success ml-2">수락됨</span>}
              </div>
              {driverApps.length === 0 ? (
                <p className="text-sm text-gbus-text-dim">아직 기사 신청이 없습니다.</p>
              ) : (
                <div className="space-y-1.5">
                  {driverApps.map((app) => (
                    <div key={app.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm ${
                      app.status === "accepted" ? "bg-gbus-success/8 border border-gbus-success/20"
                      : app.status === "rejected" ? "bg-gbus-bg/40 text-gbus-text-dim opacity-50 border border-gbus-border/10"
                      : "bg-gbus-surface-light/20 border border-gbus-border/20"
                    }`}>
                      <div>
                        <span className="font-medium">{app.driver?.game_nickname || app.driver?.nickname}</span>
                        {app.message && <span className="text-gbus-text-dim ml-2 text-xs">- {app.message}</span>}
                        {app.status === "accepted" && <Badge variant="success">수락</Badge>}
                        {app.status === "rejected" && <Badge variant="danger">거절</Badge>}
                      </div>
                      {app.status === "pending" && (
                        <div className="flex gap-1.5">
                          <Button size="sm" onClick={() => handleDriverAppAction(app.id, "accepted")}>수락</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDriverAppAction(app.id, "rejected")}>거절</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== mass_bus: 수락된 기사 컨트롤 (호스트가 아닌 기사) ===== */}
        {isMassBus && isDriver && !isHost && (
          <div className="glass rounded-2xl p-6 mb-5">
            <h3 className="font-bold mb-4 flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-gbus-accent rounded-full" />기사 컨트롤
            </h3>
            <div className="flex flex-wrap gap-2">
              {session.status === "running" && (
                <>
                  <Button variant="accent" onClick={handleCallNext} className="btn-shine">
                    다음 호출 {waitingReservations.length > 0 && `(#${waitingReservations[0].queue_no})`}
                  </Button>
                  <Button variant="secondary" onClick={handleNextRound}>R{session.round + 1} 진행</Button>
                </>
              )}
            </div>
            {calledReservation && (
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

        {/* ===== 기존: 기사/파장 컨트롤 (mass_bus 아닌 경우) ===== */}
        {!isMassBus && isDriver && (
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

            {/* 보조기사 관리 */}
            {!isParty && (
              <div className="mt-4 border-t border-gbus-border/20 pt-4">
                <div className="text-xs font-bold text-gbus-text-muted mb-2.5 uppercase tracking-wider">기사 ({sessionDrivers.length}명)</div>
                <div className="space-y-1.5 mb-3">
                  {sessionDrivers.map((d) => (
                    <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gbus-surface-light/20 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{d.user?.game_nickname || d.user?.nickname}</span>
                        <Badge variant={d.role === "main" ? "primary" : "accent"}>
                          {d.role === "main" ? "메인" : "보조"}
                        </Badge>
                      </div>
                      {isMainDriver && d.role === "sub" && (
                        <button onClick={() => handleRemoveSubDriver(d.id)} className="text-xs text-gbus-danger/70 hover:text-gbus-danger transition-colors">&times;</button>
                      )}
                    </div>
                  ))}
                </div>
                {isMainDriver && session.status === "waiting" && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={subDriverNick}
                      onChange={(e) => setSubDriverNick(e.target.value)}
                      placeholder="보조기사 인게임 닉네임"
                      className="flex-1 px-3 py-2 bg-gbus-bg/40 border border-gbus-border/40 rounded-xl text-sm text-gbus-text placeholder:text-gbus-text-dim focus:outline-none focus:border-gbus-primary focus:ring-2 focus:ring-gbus-primary/15 transition-all"
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubDriver()}
                    />
                    <Button size="sm" onClick={handleAddSubDriver} loading={addingSubDriver} disabled={!subDriverNick.trim()}>추가</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 파장: 신청자 승인 패널 */}
        {isParty && isDriver && pendingReservations.length > 0 && (
          <div className="glass rounded-2xl p-6 mb-5">
            <h3 className="font-bold mb-4 flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-gbus-warning rounded-full" />참여 신청 ({pendingReservations.length}명)
            </h3>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <button onClick={() => setPosFilter("all")}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-medium ${posFilter === "all" ? "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-primary-light" : "border-gbus-border/40 text-gbus-text-dim hover:text-gbus-text-muted"}`}>전체</button>
              {(Object.entries(POSITIONS) as [Position, typeof POSITIONS[Position]][]).map(([key, { label }]) => (
                <button key={key} onClick={() => setPosFilter(key)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-medium ${posFilter === key ? "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-primary-light" : "border-gbus-border/40 text-gbus-text-dim hover:text-gbus-text-muted"}`}>{label}</button>
              ))}
              <button onClick={() => setPosFilter("all" as Position | "all")}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer font-medium ${posFilter === "all" ? "" : "border-gbus-border/40 text-gbus-text-dim hover:text-gbus-text-muted"}`}
                style={{ display: "none" }}>reset</button>
            </div>
            <div className="space-y-1.5">
              {pendingReservations
                .filter((r) => posFilter === "all" || r.positions?.includes(posFilter) || (!r.positions?.length && posFilter))
                .map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-xl text-sm bg-gbus-warning/5 border border-gbus-warning/15">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold">{r.char_name}</span>
                    {(r.tamer_lv != null || r.digi_lv != null) && (
                      <span className="flex items-center gap-1">
                        {r.tamer_lv != null && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gbus-success/10 text-gbus-success border border-gbus-success/30">{r.tamer_lv}</span>}
                        {r.digi_lv != null && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gbus-accent-light/10 text-gbus-accent-light border border-gbus-accent-light/30">{r.digi_lv}</span>}
                      </span>
                    )}
                    {r.positions && r.positions.length > 0
                      ? r.positions.map((pos) => { const p = POSITIONS[pos as Position]; return p ? <Badge key={pos} variant={p.color}>{p.label}</Badge> : null; })
                      : <Badge variant="primary">올포지션</Badge>}
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" onClick={() => handleAccept(r.id)}>수락</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleReject(r.id)}>거절</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== mass_bus: 기사 신청 패널 (기사인증 유저용) ===== */}
        {isMassBus && !isHost && !isDriver && profile?.driver_verified && session.status === "waiting" && (
          <div className="glass rounded-2xl p-6 mb-5">
            <h3 className="font-bold mb-4 flex items-center gap-2.5">
              <span className="w-1.5 h-4 bg-gbus-accent rounded-full" />기사 신청
            </h3>
            {myDriverApp ? (
              <div className={`px-4 py-3 rounded-xl text-sm ${
                myDriverApp.status === "accepted" ? "bg-gbus-success/8 border border-gbus-success/20"
                : myDriverApp.status === "rejected" ? "bg-gbus-danger/8 border border-gbus-danger/20"
                : "bg-gbus-warning/8 border border-gbus-warning/20"
              }`}>
                <span className="font-semibold">
                  {myDriverApp.status === "accepted" ? "기사 신청이 수락되었습니다!" :
                   myDriverApp.status === "rejected" ? "기사 신청이 거절되었습니다." :
                   "기사 신청 대기 중..."}
                </span>
              </div>
            ) : !massBusMinMet ? (
              <div className="text-sm text-gbus-text-dim">
                필수 인원({session.min_count}명)이 충족된 후 기사 신청이 가능합니다.
                <span className="ml-1 text-gbus-warning font-medium">현재 {session.current_count}명</span>
              </div>
            ) : acceptedDriverApp ? (
              <div className="text-sm text-gbus-text-dim">이미 기사가 배정되었습니다.</div>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={driverAppMsg}
                  onChange={(e) => setDriverAppMsg(e.target.value)}
                  placeholder="한마디 (선택)"
                  className="px-4 py-2.5 bg-gbus-bg/40 border border-gbus-border/40 rounded-xl text-sm text-gbus-text placeholder:text-gbus-text-dim focus:outline-none focus:border-gbus-primary focus:ring-2 focus:ring-gbus-primary/15 transition-all"
                />
                <Button onClick={handleApplyDriver} loading={applyingDriver} className="btn-shine">기사 신청</Button>
              </div>
            )}
          </div>
        )}

        {/* ===== mass_bus: 일반 유저 참가 신청 ===== */}
        {isMassBus && !isHost && !isDriver && profile?.verified && (session.status === "waiting" || session.status === "running") && (
          <div className="glass rounded-2xl p-6 mb-5">
            {myReservations.length > 0 ? (
              <div className="bg-gbus-primary/8 border border-gbus-primary/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-gbus-primary-light">참가 신청 완료</p>
                <p className="text-xs text-gbus-text-dim mt-1">{myReservations.map((r) => r.char_name).join(", ")}</p>
              </div>
            ) : !showReservePanel ? (
              <Button onClick={() => setShowReservePanel(true)} className="w-full btn-shine" size="lg">참가 신청</Button>
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
                  <>
                    {minDigiLv > 0 && (
                      <p className="text-xs text-gbus-warning mb-2 font-medium">이 던전은 하인 Lv.{minDigiLv} 이상만 입장 가능합니다</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                      {barracks.map((b) => {
                        const done = reservations.some((r) => r.char_name === b.char_name && r.user_id === user?.id);
                        const lvBlocked = minDigiLv > 0 && (b.digi_lv == null || b.digi_lv < minDigiLv);
                        const disabled = done || lvBlocked;
                        const sel = selectedBarracks.includes(b.char_name);
                        return (
                          <button key={b.id} disabled={disabled} onClick={() => setSelectedBarracks((p) => sel ? p.filter((n) => n !== b.char_name) : [...p, b.char_name])}
                            className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer text-left ${
                              disabled ? "bg-gbus-bg/40 border-gbus-border/20 text-gbus-text-dim cursor-not-allowed opacity-40"
                              : sel ? "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-primary-light shadow-[0_0_10px_rgba(108,92,231,0.12)]"
                              : "border-gbus-border/40 text-gbus-text-muted hover:border-gbus-primary/30 hover:text-gbus-text"
                            }`}>
                            <span>{b.char_name}{done ? " (등록됨)" : lvBlocked ? " (레벨 부족)" : ""}</span>
                            {(b.tamer_lv != null || b.digi_lv != null) && (
                              <span className="flex items-center gap-1 mt-0.5">
                                {b.tamer_lv != null && <span className="inline-flex items-center px-1 py-px rounded text-[9px] font-bold bg-gbus-success/10 text-gbus-success border border-gbus-success/30">{b.tamer_lv}</span>}
                                {b.digi_lv != null && <span className="inline-flex items-center px-1 py-px rounded text-[9px] font-bold bg-gbus-accent-light/10 text-gbus-accent-light border border-gbus-accent-light/30">{b.digi_lv}</span>}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleReserve} loading={reserving} disabled={selectedBarracks.length === 0} className="flex-1 btn-shine">
                    {selectedBarracks.length}개 참가 신청
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowReservePanel(false); setSelectedBarracks([]); }}>취소</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 승객 예약 (mass_bus가 아닌 경우) */}
        {!isMassBus && !isDriver && profile?.verified && (session.status === "waiting" || session.status === "running") && (
          <div className="glass rounded-2xl p-6 mb-5">
            {myPending.length > 0 && (
              <div className="bg-gbus-warning/8 border border-gbus-warning/20 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-gbus-warning">참여 신청 완료 — 파장 수락 대기 중</p>
                <p className="text-xs text-gbus-text-dim mt-1">{myPending.map((r) => r.char_name).join(", ")}</p>
              </div>
            )}
            {!showReservePanel ? (
              <Button onClick={() => setShowReservePanel(true)} className="w-full btn-shine" size="lg">{isParty ? "참여 신청" : "예약하기"}</Button>
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
                  <>
                  {minDigiLv > 0 && (
                    <p className="text-xs text-gbus-warning mb-2 font-medium">이 던전은 하인 Lv.{minDigiLv} 이상만 입장 가능합니다</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                    {barracks.map((b) => {
                      const done = reservations.some((r) => r.char_name === b.char_name && r.user_id === user?.id);
                      const lvBlocked = minDigiLv > 0 && (b.digi_lv == null || b.digi_lv < minDigiLv);
                      const disabled = done || lvBlocked;
                      const sel = selectedBarracks.includes(b.char_name);
                      return (
                        <button key={b.id} disabled={disabled} onClick={() => setSelectedBarracks((p) => sel ? p.filter((n) => n !== b.char_name) : [...p, b.char_name])}
                          className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer text-left ${
                            disabled ? "bg-gbus-bg/40 border-gbus-border/20 text-gbus-text-dim cursor-not-allowed opacity-40"
                            : sel ? "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-primary-light shadow-[0_0_10px_rgba(108,92,231,0.12)]"
                            : "border-gbus-border/40 text-gbus-text-muted hover:border-gbus-primary/30 hover:text-gbus-text"
                          }`}>
                          <span>{b.char_name}{done ? " (예약됨)" : lvBlocked ? " (레벨 부족)" : ""}</span>
                          {(b.tamer_lv != null || b.digi_lv != null) && (
                            <span className="flex items-center gap-1 mt-0.5">
                              {b.tamer_lv != null && (
                                <span className="inline-flex items-center px-1 py-px rounded text-[9px] font-bold bg-gbus-success/10 text-gbus-success border border-gbus-success/30">
                                  {b.tamer_lv}
                                </span>
                              )}
                              {b.digi_lv != null && (
                                <span className="inline-flex items-center px-1 py-px rounded text-[9px] font-bold bg-gbus-accent-light/10 text-gbus-accent-light border border-gbus-accent-light/30">
                                  {b.digi_lv}
                                </span>
                              )}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  </>
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
                    {isParty ? `${selectedBarracks.length}개 참여 신청` : `${selectedBarracks.length}개 예약`}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowReservePanel(false); setSelectedBarracks([]); setSelectedPositions([]); }}>취소</Button>
                </div>
              </div>
            )}
            {!isParty && myNextWaiting && (
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
                {bids.map((b) => {
                  const isMyBid = b.driver_id === user?.id;
                  const isEditing = editingBidId === b.id;
                  return (
                    <div key={b.id} className={`px-4 py-3 rounded-xl text-sm ${
                      b.status === "accepted" ? "bg-gbus-success/8 border border-gbus-success/20"
                      : b.status === "rejected" ? "bg-gbus-bg/40 text-gbus-text-dim line-through border border-gbus-border/10 opacity-50"
                      : "bg-gbus-surface-light/30 border border-gbus-border/20"
                    }`}>
                      {isEditing ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input type="number" min={0} value={editBidPrice} onChange={(e) => setEditBidPrice(e.target.value)} placeholder="수정 가격 (T)"
                              className="flex-1 px-3 py-2 bg-gbus-bg/40 border border-gbus-border/40 rounded-lg text-sm text-gbus-text placeholder:text-gbus-text-dim focus:outline-none focus:border-gbus-primary focus:ring-2 focus:ring-gbus-primary/15 transition-all" />
                            <Button size="sm" onClick={handleBidEdit} loading={bidding} disabled={!editBidPrice}>저장</Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingBidId(null)}>취소</Button>
                          </div>
                          <input type="text" value={editBidMessage} onChange={(e) => setEditBidMessage(e.target.value)} placeholder="한마디 (선택)"
                            className="px-3 py-2 bg-gbus-bg/40 border border-gbus-border/40 rounded-lg text-sm text-gbus-text placeholder:text-gbus-text-dim focus:outline-none focus:border-gbus-primary focus:ring-2 focus:ring-gbus-primary/15 transition-all" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold">{session.status === "waiting" && !isMyBid ? getAnonymousName(b.id) : isMyBid ? "나" : (b.driver?.game_nickname || b.driver?.nickname)}</span>
                            <span className="text-gbus-accent font-black ml-2">{b.price_t}T</span>
                            {b.message && <span className="text-gbus-text-dim ml-2 text-xs">- {b.message}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {b.status === "accepted" && <Badge variant="success">수락</Badge>}
                            {b.status === "rejected" && <Badge variant="danger">거절</Badge>}
                            {b.status === "pending" && (canControl || isDriver) && !isMyBid && (<><Button size="sm" onClick={() => handleBidAction(b.id, "accepted")}>수락</Button><Button variant="ghost" size="sm" onClick={() => handleBidAction(b.id, "rejected")}>거절</Button></>)}
                            {b.status === "pending" && isMyBid && (
                              <>
                                <Badge variant="warning">대기</Badge>
                                <Button variant="secondary" size="sm" onClick={() => { setEditingBidId(b.id); setEditBidPrice(String(b.price_t)); setEditBidMessage(b.message || ""); }}>수정</Button>
                                <Button variant="danger" size="sm" onClick={() => handleBidCancel(b.id)}>취소</Button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (<p className="text-sm text-gbus-text-muted mb-4">아직 입찰이 없습니다.</p>)}

            {!isDriver && !isHost && (isMassBus ? profile?.driver_verified : profile?.verified) && !bids.some((b) => b.driver_id === user?.id) && (
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
              <span className="w-1.5 h-4 bg-gbus-primary rounded-full" />{isParty ? "참여자" : "대기열"} ({activeReservations.length}명)
            </h3>
            <div className="flex gap-4 text-xs font-medium">
              {isParty ? (
                <>
                  {(Object.entries(POSITIONS) as [Position, typeof POSITIONS[Position]][]).map(([key, { label }]) => {
                    const count = activeReservations.filter((r) => r.positions?.includes(key)).length;
                    return count > 0 ? <span key={key} className="text-gbus-text-muted">{label} {count}</span> : null;
                  })}
                  {(() => {
                    const allPosCount = activeReservations.filter((r) => !r.positions || r.positions.length === 0).length;
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

          {activeReservations.length === 0 ? (
            <div className="text-center py-12"><div className="text-4xl mb-3 opacity-15">&#x1F465;</div><p className="text-gbus-text-muted text-sm">{isParty ? "아직 수락된 참여자가 없습니다" : "예약이 없습니다"}</p></div>
          ) : (
            <div className="space-y-1.5">
              {activeReservations.map((r, idx) => {
                const mine = r.user_id === user?.id;
                const canSee = canControl || mine;
                const displayName = canSee ? r.char_name : `승객 #${idx + 1}`;
                return (
                  <div key={r.id} className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${
                    r.status === "called" ? "bg-gbus-accent/8 border border-gbus-accent/20 shadow-[0_0_16px_rgba(0,206,201,0.06)]"
                    : r.status === "done" ? "bg-gbus-bg/30 text-gbus-text-dim"
                    : r.status === "noshow" ? "bg-gbus-danger/5 text-gbus-text-dim line-through opacity-40"
                    : mine ? "bg-gbus-primary/6 border border-gbus-primary/15"
                    : "bg-gbus-surface-light/20 border border-transparent hover:bg-gbus-surface-light/30"
                  }`}>
                    <div className="flex items-center gap-3">
                      {!isParty && <span className="text-gbus-text-dim w-8 font-mono text-xs font-medium">#{r.queue_no}</span>}
                      {canSee ? (
                        <button onClick={() => copyNickname(r.char_name)} className="hover:text-gbus-primary-light transition-colors cursor-pointer font-semibold" title="복사">
                          {displayName}
                        </button>
                      ) : (
                        <span className="text-gbus-text-dim font-medium">{displayName}</span>
                      )}
                      {mine && <Badge variant="primary">나</Badge>}
                      {isParty && (r.positions && r.positions.length > 0
                        ? r.positions.map((pos) => {
                            const p = POSITIONS[pos as Position];
                            return p ? <Badge key={pos} variant={p.color}>{p.label}</Badge> : null;
                          })
                        : <Badge variant="primary">올포지션</Badge>
                      )}
                      {/* 테렙/디렙: 기사/호스트 또는 본인만 볼 수 있음 */}
                      {canSee && (r.tamer_lv != null || r.digi_lv != null) && (
                        <span className="flex items-center gap-1 ml-1">
                          {r.tamer_lv != null && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gbus-success/10 text-gbus-success border border-gbus-success/30">
                              {r.tamer_lv}
                            </span>
                          )}
                          {r.digi_lv != null && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gbus-accent-light/10 text-gbus-accent-light border border-gbus-accent-light/30">
                              {r.digi_lv}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {r.status === "called" && <Badge variant="accent">호출됨</Badge>}
                      {r.status === "done" && <Badge variant="success">완료</Badge>}
                      {r.status === "noshow" && <Badge variant="danger">노쇼</Badge>}
                      {r.status === "waiting" && canControl && !isParty && <Button variant="ghost" size="sm" onClick={() => copyNickname(r.char_name)}>복사</Button>}
                      {isParty && mine && r.status === "waiting" && session?.status === "waiting" && (
                        <Button variant="danger" size="sm" onClick={() => handleLeave(r.id)}>탈퇴</Button>
                      )}
                      {/* mass_bus 호스트는 대기열에서 캐릭터 제거 가능 */}
                      {isMassBus && isHost && r.status === "waiting" && session?.status === "waiting" && (
                        <button onClick={() => handleHostRemoveChar(r.id)} className="text-xs text-gbus-danger/70 hover:text-gbus-danger transition-colors cursor-pointer px-1">&times;</button>
                      )}
                      {!mine && profile?.verified && (
                        <button
                          onClick={() => setReportTarget({ userId: r.user_id, name: r.char_name })}
                          className="text-gbus-text-dim hover:text-gbus-danger transition-colors text-xs cursor-pointer px-1"
                          title="신고"
                        >
                          &#x26A0;
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <PromoCard placement="waiting" className="mt-6" />
      </main>

      {reportTarget && user && (
        <ReportModal
          targetName={reportTarget.name}
          targetUserId={reportTarget.userId}
          reporterId={user.id}
          sessionId={sessionId}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
