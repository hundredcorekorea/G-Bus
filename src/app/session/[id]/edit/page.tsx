"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast, ToastContainer } from "@/components/ui/Toast";
import { DUNGEONS, POST_TYPE_LABEL, DUNGEON_NAMES, FIELD_NAMES, EXP_NAMES, MASS_BUS_NAMES } from "@/lib/constants";
import type { BusSession, PriceType } from "@/lib/types";

const DUNGEON_MAP: Record<string, readonly string[]> = {
  party: DUNGEON_NAMES,
  bus: DUNGEON_NAMES,
  field_party: FIELD_NAMES,
  exp_party: EXP_NAMES,
  mass_bus: MASS_BUS_NAMES,
};

const DUNGEON_LABEL: Record<string, string> = {
  party: "던전",
  bus: "던전",
  field_party: "지역",
  exp_party: "던전",
  mass_bus: "던전",
};

const MULTI_SELECT_TYPES = new Set(["party", "bus"]);

const SHOW_PRICE: Record<string, boolean> = {
  party: false, bus: true, field_party: false, exp_party: true, mass_bus: true,
};
const SHOW_PRICE_TYPE: Record<string, boolean> = {
  party: false, bus: false, field_party: false, exp_party: false, mass_bus: true,
};
const SHOW_SCHEDULE: Record<string, boolean> = {
  party: false, bus: false, field_party: false, exp_party: false, mass_bus: true,
};
const SHOW_ROUND_MINUTES: Record<string, boolean> = {
  party: false, bus: true, field_party: false, exp_party: true, mass_bus: true,
};

export default function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const { user, profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [session, setSession] = useState<BusSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDungeonNames, setSelectedDungeonNames] = useState<string[]>([]);
  const [priceType, setPriceType] = useState<PriceType>("fixed");
  const [priceT, setPriceT] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [avgRoundMinutes, setAvgRoundMinutes] = useState(10);

  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase
        .from("bus_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (error || !data) {
        toast("세션을 찾을 수 없습니다.", "error");
        setLoading(false);
        return;
      }
      setSession(data as BusSession);
      setSelectedDungeonNames(data.dungeon_name.split(",").map((s: string) => s.trim()));
      setPriceType(data.price_type || "fixed");
      setPriceT(data.price_t != null ? String(data.price_t) : "");
      setScheduledStart(data.scheduled_start ? new Date(data.scheduled_start).toISOString().slice(0, 16) : "");
      setAvgRoundMinutes(data.avg_round_minutes || 10);
      setLoading(false);
    };
    fetchSession();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="min-h-screen"><Header />
      <div className="flex items-center justify-center py-20"><div className="w-10 h-10 rounded-full border-2 border-gbus-primary border-t-transparent animate-spin" /></div>
    </div>
  );

  if (!session) return (
    <div className="min-h-screen"><Header />
      <div className="flex flex-col items-center justify-center py-20"><p className="text-gbus-text-muted">세션을 찾을 수 없습니다.</p></div>
    </div>
  );

  const canEdit = user && (session.driver_id === user.id || session.host_user_id === user.id || profile?.is_admin || profile?.is_moderator);
  if (!canEdit) return (
    <div className="min-h-screen"><Header />
      <div className="flex flex-col items-center justify-center py-20"><p className="text-gbus-text-muted">수정 권한이 없습니다.</p></div>
    </div>
  );

  const postType = session.post_type;
  const dungeonNames = DUNGEON_MAP[postType] || DUNGEON_NAMES;
  const multiSelect = MULTI_SELECT_TYPES.has(postType);
  const showPrice = SHOW_PRICE[postType] ?? false;
  const showPriceType = SHOW_PRICE_TYPE[postType] ?? false;
  const showSchedule = SHOW_SCHEDULE[postType] ?? false;
  const showRoundMinutes = SHOW_ROUND_MINUTES[postType] ?? false;

  const selectDungeon = (name: string) => {
    if (multiSelect) {
      setSelectedDungeonNames((prev) => {
        if (prev.includes(name)) {
          if (prev.length === 1) return prev;
          return prev.filter((n) => n !== name);
        }
        return [...prev, name];
      });
    } else {
      setSelectedDungeonNames([name]);
    }
  };

  const selectedDungeonConfigs = selectedDungeonNames
    .map((name) => DUNGEONS.find((d) => d.name === name))
    .filter(Boolean);
  const partySize = selectedDungeonConfigs.some((d) => d!.partySize === 4) ? 4 : 2;
  const barrackMin = selectedDungeonConfigs.length > 0
    ? Math.max(...selectedDungeonConfigs.map((d) => d!.barrackMinCount))
    : 0;

  const buildTitle = () => {
    const names = selectedDungeonNames.join("");
    if (postType === "party") return `${names} ${partySize}인파티 모집`;
    if (postType === "bus") return `${names} 승객모집 ${priceT ? priceT + "T" : ""}`.trim();
    if (postType === "field_party") return `${names} 필드파티 모집`;
    if (postType === "exp_party") return `${names} 경팟 ${priceT ? priceT + "T" : ""}`.trim();
    const timeStr = scheduledStart
      ? new Date(scheduledStart).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      : "";
    const priceStr = priceType === "auction"
      ? `역경매 ${priceT ? "희망 " + priceT + "T" : ""}`
      : priceT ? priceT + "T" : "";
    return `${names} 대량모집 ${barrackMin}+@ ${timeStr} ${priceStr}`.trim();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDungeonNames.length === 0) {
      toast(`${DUNGEON_LABEL[postType] || "던전"}을 1개 이상 선택해 주세요.`, "error");
      return;
    }
    if (showPrice && !showPriceType && !priceT) {
      toast("가격(T)을 입력해 주세요.", "error");
      return;
    }
    if (showPriceType && priceType === "fixed" && !priceT) {
      toast("가격(T)을 입력해 주세요.", "error");
      return;
    }

    setSaving(true);
    const title = buildTitle();
    const minCount = postType === "party" || postType === "field_party"
      ? partySize
      : postType === "mass_bus"
        ? barrackMin
        : 1;

    const updateData: Record<string, unknown> = {
      title,
      dungeon_name: selectedDungeonNames.join(","),
      price_type: showPriceType ? priceType : "fixed",
      min_count: minCount,
      avg_round_minutes: avgRoundMinutes,
      price_t: priceT ? Number(priceT) : null,
      scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("bus_sessions")
      .update(updateData)
      .eq("id", sessionId);

    if (error) {
      toast("수정 실패: " + error.message, "error");
      setSaving(false);
      return;
    }

    toast("수정 완료!", "success");
    router.push(`/session/${sessionId}`);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-lg mx-auto px-4 py-8 animate-fade-up">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-gbus-accent rounded-full" />
          글 수정
        </h1>

        <div className="glass rounded-2xl p-6">
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            {/* 글 타입 (읽기 전용) */}
            <div>
              <label className="text-sm font-semibold text-gbus-text-muted block mb-2.5">글 타입</label>
              <Badge variant="primary">{POST_TYPE_LABEL[postType]}</Badge>
              <span className="text-xs text-gbus-text-dim ml-2">변경 불가</span>
            </div>

            {/* 던전/지역 선택 */}
            <div>
              <label className="text-sm font-semibold text-gbus-text-muted block mb-2.5">
                {DUNGEON_LABEL[postType] || "던전"}
                {multiSelect && (
                  <span className="text-gbus-primary-light ml-1">({selectedDungeonNames.length}개 선택)</span>
                )}
              </label>
              <div className={`grid gap-2 ${dungeonNames.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                {dungeonNames.map((name) => {
                  const selected = selectedDungeonNames.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => selectDungeon(name as string)}
                      className={`py-2.5 px-3 text-sm rounded-xl transition-all duration-300 cursor-pointer border text-center ${
                        selected
                          ? "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-text shadow-[0_0_12px_rgba(108,92,231,0.12)]"
                          : "border-gbus-border/40 text-gbus-text-dim hover:border-gbus-text-dim hover:text-gbus-text-muted"
                      }`}
                    >
                      <span className="font-medium">{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 가격 방식 (대량 모집만) */}
            {showPriceType && (
              <div>
                <label className="text-sm font-semibold text-gbus-text-muted block mb-2.5">가격 방식</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPriceType("fixed")}
                    className={`flex-1 py-3 text-sm rounded-xl transition-all duration-300 cursor-pointer border font-semibold ${
                      priceType === "fixed"
                        ? "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-primary-light"
                        : "border-gbus-border/40 text-gbus-text-dim hover:border-gbus-text-dim"
                    }`}
                  >
                    고정가
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceType("auction")}
                    className={`flex-1 py-3 text-sm rounded-xl transition-all duration-300 cursor-pointer border font-semibold ${
                      priceType === "auction"
                        ? "bg-gbus-warning/15 border-gbus-warning/40 text-gbus-warning"
                        : "border-gbus-border/40 text-gbus-text-dim hover:border-gbus-text-dim"
                    }`}
                  >
                    역경매
                  </button>
                </div>
              </div>
            )}

            {/* 가격 */}
            {showPrice && !showPriceType && (
              <Input label="가격 (T)" type="number" min={0} value={priceT} onChange={(e) => setPriceT(e.target.value)} placeholder="인게임 재화 (T)" required />
            )}
            {showPriceType && (
              <Input
                label={priceType === "auction" ? "희망 가격 (T, 선택)" : "가격 (T)"}
                type="number" min={0} value={priceT} onChange={(e) => setPriceT(e.target.value)}
                placeholder={priceType === "auction" ? "기사에게 참고용 희망 가격" : "인게임 재화 (T)"}
                required={priceType === "fixed"}
              />
            )}

            {showSchedule && (
              <Input label="시작 시간대 (선택)" type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
            )}

            {showRoundMinutes && (
              <Input label="회차당 예상 소요 시간 (분)" type="number" min={1} value={String(avgRoundMinutes)} onChange={(e) => setAvgRoundMinutes(Number(e.target.value))} />
            )}

            {/* 미리보기 */}
            <div className="bg-gbus-bg/40 rounded-xl p-4 border border-gbus-border/20">
              <p className="text-xs text-gbus-text-dim mb-2 font-medium">미리보기</p>
              <p className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                <Badge variant="primary">{POST_TYPE_LABEL[postType]}</Badge>
                <span>{buildTitle()}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => router.back()}>
                취소
              </Button>
              <Button type="submit" loading={saving} size="lg" className="flex-1 btn-shine">
                수정 완료
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
