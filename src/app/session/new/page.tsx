"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast, ToastContainer } from "@/components/ui/Toast";
import { DUNGEONS, POST_TYPE_LABEL, DUNGEON_NAMES, FIELD_NAMES, EXP_NAMES, MASS_BUS_NAMES } from "@/lib/constants";
import type { PostType, PriceType } from "@/lib/types";

// 글 타입별 설정
interface PostTypeConfig {
  type: PostType;
  label: string;
  dungeonNames: readonly string[];
  dungeonLabel: string; // 던전/지역 선택 라벨
  isDriver: boolean; // 기사 전용인지
  needsBarrack: boolean; // 배럭 인증 필요
  multiSelect: boolean;
  showPrice: boolean;
  showPriceType: boolean; // 고정가/역경매 선택
  showSchedule: boolean;
  showRoundMinutes: boolean;
  color: string; // active 색상 키
}

const POST_CONFIGS: PostTypeConfig[] = [
  {
    type: "party", label: "던전 공팟 모집",
    dungeonNames: DUNGEON_NAMES, dungeonLabel: "던전",
    isDriver: false, needsBarrack: false, multiSelect: true,
    showPrice: false, showPriceType: false, showSchedule: false, showRoundMinutes: false,
    color: "primary",
  },
  {
    type: "bus", label: "승객 모집(기사)",
    dungeonNames: DUNGEON_NAMES, dungeonLabel: "던전",
    isDriver: true, needsBarrack: false, multiSelect: true,
    showPrice: true, showPriceType: false, showSchedule: false, showRoundMinutes: true,
    color: "accent",
  },
  {
    type: "field_party", label: "필드 파티 모집",
    dungeonNames: FIELD_NAMES, dungeonLabel: "지역",
    isDriver: false, needsBarrack: false, multiSelect: false,
    showPrice: false, showPriceType: false, showSchedule: false, showRoundMinutes: false,
    color: "success",
  },
  {
    type: "exp_party", label: "경험치 파티 모집(기사)",
    dungeonNames: EXP_NAMES, dungeonLabel: "던전",
    isDriver: true, needsBarrack: false, multiSelect: false,
    showPrice: true, showPriceType: false, showSchedule: false, showRoundMinutes: true,
    color: "warning",
  },
  {
    type: "mass_bus", label: "던전 승객 모집(대량)",
    dungeonNames: MASS_BUS_NAMES, dungeonLabel: "던전",
    isDriver: false, needsBarrack: true, multiSelect: false,
    showPrice: true, showPriceType: true, showSchedule: true, showRoundMinutes: true,
    color: "primary",
  },
];

const COLOR_MAP: Record<string, { active: string; badge: "default" | "accent" | "success" | "warning" | "primary" }> = {
  primary: {
    active: "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-primary-light shadow-[0_0_12px_rgba(108,92,231,0.15)]",
    badge: "primary",
  },
  accent: {
    active: "bg-gbus-accent/15 border-gbus-accent/40 text-gbus-accent shadow-[0_0_12px_rgba(0,206,201,0.15)]",
    badge: "accent",
  },
  success: {
    active: "bg-gbus-success/15 border-gbus-success/40 text-gbus-success shadow-[0_0_12px_rgba(0,184,148,0.15)]",
    badge: "success",
  },
  warning: {
    active: "bg-gbus-warning/15 border-gbus-warning/40 text-gbus-warning shadow-[0_0_12px_rgba(253,167,0,0.15)]",
    badge: "warning",
  },
};

export default function NewSessionPage() {
  const { profile } = useAuth();
  const [postType, setPostType] = useState<PostType>("party");
  const [selectedDungeonNames, setSelectedDungeonNames] = useState<string[]>([DUNGEON_NAMES[0]]);
  const [priceType, setPriceType] = useState<PriceType>("fixed");
  const [priceT, setPriceT] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [avgRoundMinutes, setAvgRoundMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const config = POST_CONFIGS.find((c) => c.type === postType)!;

  // 사용 가능한 타입 필터링
  const availableConfigs = POST_CONFIGS.filter((c) => {
    if (c.isDriver && !profile?.verified) return false;
    if (c.needsBarrack && !profile?.barrack_verified) return false;
    return true;
  });

  const selectDungeon = (name: string) => {
    if (config.multiSelect) {
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

  const handlePostTypeChange = (type: PostType) => {
    setPostType(type);
    const newConfig = POST_CONFIGS.find((c) => c.type === type)!;
    setSelectedDungeonNames([newConfig.dungeonNames[0] as string]);
    setPriceT("");
    setPriceType("fixed");
    setScheduledStart("");
  };

  // 선택된 던전들의 DUNGEONS 설정 가져오기
  const selectedDungeonConfigs = selectedDungeonNames
    .map((name) => DUNGEONS.find((d) => d.name === name))
    .filter(Boolean);
  const partySize = selectedDungeonConfigs.some((d) => d!.partySize === 4) ? 4 : 2;
  const barrackMin = selectedDungeonConfigs.length > 0
    ? Math.max(...selectedDungeonConfigs.map((d) => d!.barrackMinCount))
    : 0;

  const buildTitle = () => {
    const names = selectedDungeonNames.join("");
    if (postType === "party") {
      return `${names} ${partySize}인파티 모집`;
    }
    if (postType === "bus") {
      return `${names} 승객모집 ${priceT ? priceT + "T" : ""}`.trim();
    }
    if (postType === "field_party") {
      return `${names} 필드파티 모집`;
    }
    if (postType === "exp_party") {
      return `${names} 경팟 ${priceT ? priceT + "T" : ""}`.trim();
    }
    // mass_bus
    const timeStr = scheduledStart
      ? new Date(scheduledStart).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      : "";
    const priceStr = priceType === "auction"
      ? `역경매 ${priceT ? "희망 " + priceT + "T" : ""}`
      : priceT ? priceT + "T" : "";
    return `${names} 대량모집 ${barrackMin}+@ ${timeStr} ${priceStr}`.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDungeonNames.length === 0) {
      toast(`${config.dungeonLabel}을 1개 이상 선택해 주세요.`, "error");
      return;
    }
    if (config.showPrice && !config.showPriceType && !priceT) {
      toast("가격(T)을 입력해 주세요.", "error");
      return;
    }
    if (config.showPriceType && priceType === "fixed" && !priceT) {
      toast("가격(T)을 입력해 주세요.", "error");
      return;
    }

    setLoading(true);

    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession?.user) {
      toast("로그인이 필요합니다.", "error");
      setLoading(false);
      return;
    }
    const user = authSession.user;

    const title = buildTitle();
    const minCount = postType === "party" || postType === "field_party"
      ? partySize
      : postType === "mass_bus"
        ? barrackMin
        : 1;

    const insertData: Record<string, unknown> = {
      driver_id: user.id,
      title,
      dungeon_name: selectedDungeonNames.join(","),
      post_type: postType,
      price_type: config.showPriceType ? priceType : "fixed",
      min_count: minCount,
      avg_round_minutes: avgRoundMinutes,
      price_t: priceT ? Number(priceT) : null,
      scheduled_start: scheduledStart ? new Date(scheduledStart).toISOString() : null,
      party_size: (postType === "party" || postType === "field_party") ? partySize : null,
    };

    // mass_bus: 모집인(호스트)이 글을 작성, 기사는 별도 신청
    if (postType === "mass_bus") {
      insertData.host_user_id = user.id;
    }

    const { data, error } = await supabase
      .from("bus_sessions")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast("글 작성 실패: " + error.message, "error");
      setLoading(false);
      return;
    }

    router.push(`/session/${data.id}`);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-lg mx-auto px-4 py-8 animate-fade-up">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-gbus-primary rounded-full" />
          글 작성
        </h1>

        <div className="glass rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* 글 타입 선택 */}
            <div>
              <label className="text-sm font-semibold text-gbus-text-muted block mb-2.5">글 타입</label>
              <div className="flex flex-wrap gap-2">
                {availableConfigs.map((c) => {
                  const colorKey = c.color;
                  const colors = COLOR_MAP[colorKey] || COLOR_MAP.primary;
                  return (
                    <button
                      key={c.type}
                      type="button"
                      onClick={() => handlePostTypeChange(c.type)}
                      className={`px-3 py-2.5 text-xs rounded-xl transition-all duration-300 cursor-pointer border font-semibold ${
                        postType === c.type
                          ? colors.active
                          : "border-gbus-border/40 text-gbus-text-dim hover:border-gbus-text-dim hover:text-gbus-text-muted"
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              {availableConfigs.length <= 2 && (
                <p className="text-xs text-gbus-text-dim mt-2">
                  인증 시 추가 글 타입이 해금됩니다.
                </p>
              )}
            </div>

            {/* 던전/지역 선택 */}
            <div>
              <label className="text-sm font-semibold text-gbus-text-muted block mb-2.5">
                {config.dungeonLabel}
                {config.multiSelect && (
                  <span className="text-gbus-primary-light ml-1">({selectedDungeonNames.length}개 선택)</span>
                )}
              </label>
              <div className={`grid gap-2 ${config.dungeonNames.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                {config.dungeonNames.map((name) => {
                  const selected = selectedDungeonNames.includes(name);
                  const dungeonConf = DUNGEONS.find((d) => d.name === name);
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
                      {dungeonConf && (
                        <span className="text-[10px] text-gbus-text-dim block mt-0.5">
                          {postType === "party" && `${dungeonConf.partySize}인`}
                          {postType === "mass_bus" && dungeonConf.barrackMinCount > 0 && `${dungeonConf.barrackMinCount}+@`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 가격 방식 (대량 모집만) */}
            {config.showPriceType && (
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
                {priceType === "auction" && (
                  <p className="text-xs text-gbus-text-dim mt-2">
                    버스기사들이 가격을 제안합니다. 희망 가격을 적으면 참고됩니다.
                  </p>
                )}
              </div>
            )}

            {/* 가격 */}
            {config.showPrice && !config.showPriceType && (
              <Input label="가격 (T)" type="number" min={0} value={priceT} onChange={(e) => setPriceT(e.target.value)} placeholder="인게임 재화 (T)" required />
            )}
            {config.showPriceType && (
              <Input
                label={priceType === "auction" ? "희망 가격 (T, 선택)" : "가격 (T)"}
                type="number" min={0} value={priceT} onChange={(e) => setPriceT(e.target.value)}
                placeholder={priceType === "auction" ? "기사에게 참고용 희망 가격" : "인게임 재화 (T)"}
                required={priceType === "fixed"}
              />
            )}

            {config.showSchedule && (
              <Input label="시작 시간대 (선택)" type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
            )}

            {config.showRoundMinutes && (
              <Input label="회차당 예상 소요 시간 (분)" type="number" min={1} value={String(avgRoundMinutes)} onChange={(e) => setAvgRoundMinutes(Number(e.target.value))} />
            )}

            {/* 미리보기 */}
            <div className="bg-gbus-bg/40 rounded-xl p-4 border border-gbus-border/20">
              <p className="text-xs text-gbus-text-dim mb-2 font-medium">미리보기</p>
              <p className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                <Badge variant={(COLOR_MAP[config.color] || COLOR_MAP.primary).badge}>
                  {POST_TYPE_LABEL[postType]}
                </Badge>
                <span>{buildTitle()}</span>
              </p>
            </div>

            <Button type="submit" loading={loading} size="lg" className="w-full mt-1 btn-shine">
              글 작성
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
