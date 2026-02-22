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
import { DUNGEONS, POST_TYPE_LABEL } from "@/lib/constants";
import type { PostType, PriceType } from "@/lib/types";

export default function NewSessionPage() {
  const { profile } = useAuth();
  const [postType, setPostType] = useState<PostType>("party");
  const [selectedDungeons, setSelectedDungeons] = useState<number[]>([0]);
  const [priceType, setPriceType] = useState<PriceType>("fixed");
  const [priceT, setPriceT] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [avgRoundMinutes, setAvgRoundMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // 배럭: barrackMinCount > 0인 던전만, 파티/버스: 메키이(배럭 전용 묶음) 제외
  const BARRACK_ONLY = ["메키이"];
  const availableDungeons = postType === "barrack_bus"
    ? DUNGEONS.map((d, i) => ({ ...d, idx: i })).filter((d) => d.barrackMinCount > 0)
    : DUNGEONS.map((d, i) => ({ ...d, idx: i })).filter((d) => !BARRACK_ONLY.includes(d.name));

  const availableTypes: PostType[] = ["party"];
  if (profile?.verified) availableTypes.push("bus");
  if (profile?.barrack_verified) availableTypes.push("barrack_bus");

  const isMultiSelect = postType !== "barrack_bus";

  const selectDungeon = (idx: number) => {
    if (isMultiSelect) {
      setSelectedDungeons((prev) => {
        if (prev.includes(idx)) {
          if (prev.length === 1) return prev; // 최소 1개 유지
          return prev.filter((i) => i !== idx);
        }
        return [...prev, idx];
      });
    } else {
      setSelectedDungeons([idx]); // 배럭: 단일 선택
    }
  };

  const handlePostTypeChange = (type: PostType) => {
    setPostType(type);
    // postType 변경 시 선택 초기화
    if (type === "barrack_bus") {
      const first = DUNGEONS.findIndex((d) => d.barrackMinCount > 0);
      setSelectedDungeons(first >= 0 ? [first] : []);
    } else {
      setSelectedDungeons([0]);
    }
  };

  const selectedNames = selectedDungeons.map((i) => DUNGEONS[i].name).join("");
  const selectedPartySizes = selectedDungeons.map((i) => DUNGEONS[i].partySize);
  const partySize = selectedPartySizes.some((s) => s === 4) ? 4 : 2;
  const barrackMin = selectedDungeons.length > 0
    ? Math.max(...selectedDungeons.map((i) => DUNGEONS[i].barrackMinCount))
    : 0;

  const buildTitle = () => {
    if (postType === "party") {
      return `${selectedNames} ${partySize}인파티 모집`;
    }
    if (postType === "bus") {
      return `${selectedNames} 승객모집 ${priceT ? priceT + "T" : ""}`.trim();
    }
    const timeStr = scheduledStart
      ? new Date(scheduledStart).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      : "";
    const priceStr = priceType === "auction"
      ? `역경매 ${priceT ? "희망 " + priceT + "T" : ""}`
      : priceT ? priceT + "T" : "";
    return `${selectedNames} 모집 ${barrackMin}+@ ${timeStr} ${priceStr}`.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDungeons.length === 0) {
      toast("던전을 1개 이상 선택해 주세요.", "error");
      return;
    }
    if (postType === "bus" && !priceT) {
      toast("가격(T)을 입력해 주세요.", "error");
      return;
    }
    if (postType === "barrack_bus" && priceType === "fixed" && !priceT) {
      toast("가격(T)을 입력해 주세요.", "error");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast("로그인이 필요합니다.", "error");
      setLoading(false);
      return;
    }

    const title = buildTitle();
    const minCount = postType === "party"
      ? partySize
      : postType === "barrack_bus"
        ? barrackMin
        : 1;

    const { data, error } = await supabase
      .from("bus_sessions")
      .insert({
        driver_id: user.id,
        title,
        dungeon_name: selectedDungeons.map((i) => DUNGEONS[i].name).join(","),
        post_type: postType,
        price_type: postType === "barrack_bus" ? priceType : "fixed",
        min_count: minCount,
        avg_round_minutes: avgRoundMinutes,
        price_t: priceT ? Number(priceT) : null,
        scheduled_start: scheduledStart || null,
        party_size: postType === "party" ? partySize : null,
      })
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
              <div className="flex gap-2">
                {availableTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handlePostTypeChange(type)}
                    className={`flex-1 py-3 text-sm rounded-xl transition-all duration-300 cursor-pointer border font-semibold ${
                      postType === type
                        ? type === "barrack_bus"
                          ? "bg-gbus-success/15 border-gbus-success/40 text-gbus-success shadow-[0_0_12px_rgba(0,184,148,0.15)]"
                          : type === "bus"
                            ? "bg-gbus-accent/15 border-gbus-accent/40 text-gbus-accent shadow-[0_0_12px_rgba(0,206,201,0.15)]"
                            : "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-primary-light shadow-[0_0_12px_rgba(108,92,231,0.15)]"
                        : "border-gbus-border/40 text-gbus-text-dim hover:border-gbus-text-dim hover:text-gbus-text-muted"
                    }`}
                  >
                    {POST_TYPE_LABEL[type]}
                  </button>
                ))}
              </div>
              {availableTypes.length === 1 && (
                <p className="text-xs text-gbus-text-dim mt-2">
                  버스기사/배럭 인증 시 추가 글 타입이 해금됩니다.
                </p>
              )}
            </div>

            {/* 던전 선택 */}
            <div>
              <label className="text-sm font-semibold text-gbus-text-muted block mb-2.5">
                던전 {isMultiSelect && <span className="text-gbus-primary-light">({selectedDungeons.length}개 선택)</span>}
              </label>
              <div className={`grid gap-2 ${postType === "barrack_bus" ? "grid-cols-2" : "grid-cols-3"}`}>
                {availableDungeons.map((d) => {
                  const selected = selectedDungeons.includes(d.idx);
                  return (
                    <button
                      key={d.name}
                      type="button"
                      onClick={() => selectDungeon(d.idx)}
                      className={`py-2.5 px-3 text-sm rounded-xl transition-all duration-300 cursor-pointer border text-center ${
                        selected
                          ? "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-text shadow-[0_0_12px_rgba(108,92,231,0.12)]"
                          : "border-gbus-border/40 text-gbus-text-dim hover:border-gbus-text-dim hover:text-gbus-text-muted"
                      }`}
                    >
                      <span className="font-medium">{d.name}</span>
                      <span className="text-[10px] text-gbus-text-dim block mt-0.5">
                        {postType === "party" && `${d.partySize}인`}
                        {postType === "barrack_bus" && `${d.barrackMinCount}+@`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 가격 방식 (배럭만) */}
            {postType === "barrack_bus" && (
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
            {postType === "bus" && (
              <Input label="가격 (T)" type="number" min={0} value={priceT} onChange={(e) => setPriceT(e.target.value)} placeholder="인게임 재화 (T)" required />
            )}
            {postType === "barrack_bus" && (
              <Input
                label={priceType === "auction" ? "희망 가격 (T, 선택)" : "가격 (T)"}
                type="number" min={0} value={priceT} onChange={(e) => setPriceT(e.target.value)}
                placeholder={priceType === "auction" ? "기사에게 참고용 희망 가격" : "인게임 재화 (T)"}
                required={priceType === "fixed"}
              />
            )}

            {postType === "barrack_bus" && (
              <Input label="시작 시간대 (선택)" type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
            )}

            {/* 파티 모집에서는 소요시간 제외 */}
            {postType !== "party" && (
              <Input label="회차당 예상 소요 시간 (분)" type="number" min={1} value={String(avgRoundMinutes)} onChange={(e) => setAvgRoundMinutes(Number(e.target.value))} />
            )}

            {/* 미리보기 */}
            <div className="bg-gbus-bg/40 rounded-xl p-4 border border-gbus-border/20">
              <p className="text-xs text-gbus-text-dim mb-2 font-medium">미리보기</p>
              <p className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                <Badge variant={postType === "barrack_bus" ? "success" : postType === "bus" ? "accent" : "default"}>
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
