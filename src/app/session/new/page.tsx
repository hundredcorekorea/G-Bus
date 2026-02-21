"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { toast, ToastContainer } from "@/components/ui/Toast";
import { MIN_BUS_COUNT } from "@/lib/constants";

export default function NewSessionPage() {
  const [title, setTitle] = useState("");
  const [dungeonName, setDungeonName] = useState("");
  const [minCount, setMinCount] = useState(MIN_BUS_COUNT);
  const [avgRoundMinutes, setAvgRoundMinutes] = useState(10);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast("로그인이 필요합니다.", "error");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("bus_sessions")
      .insert({
        driver_id: user.id,
        title: title.trim(),
        dungeon_name: dungeonName.trim(),
        min_count: minCount,
        avg_round_minutes: avgRoundMinutes,
      })
      .select()
      .single();

    if (error) {
      toast("세션 생성 실패: " + error.message, "error");
      setLoading(false);
      return;
    }

    router.push(`/session/${data.id}`);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">버스 세션 만들기</h1>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="세션 제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 다크웹 하드 1~5회차"
              required
            />
            <Input
              label="던전 이름"
              value={dungeonName}
              onChange={(e) => setDungeonName(e.target.value)}
              placeholder="예: 다크웹, 카던, 레이드 등"
              required
            />
            <Input
              label="최소 출발 인원"
              type="number"
              min={1}
              value={String(minCount)}
              onChange={(e) => setMinCount(Number(e.target.value))}
            />
            <Input
              label="회차당 예상 소요 시간 (분)"
              type="number"
              min={1}
              value={String(avgRoundMinutes)}
              onChange={(e) => setAvgRoundMinutes(Number(e.target.value))}
            />

            <div className="bg-gbus-bg rounded-lg p-3 text-sm text-gbus-text-muted">
              <p>최소 <strong className="text-gbus-accent">{minCount}명</strong>이 모이면 수익 구간에 진입합니다.</p>
              <p>초과 인원은 무제한으로 대기열에 추가됩니다.</p>
            </div>

            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              세션 생성
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
