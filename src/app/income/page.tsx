"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast, ToastContainer } from "@/components/ui/Toast";
import { INCOME_REGIONS } from "@/lib/constants";
import type { FieldIncomeRecord } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function IncomePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();

  // 입력 폼
  const [region, setRegion] = useState<string>(INCOME_REGIONS[0]);
  const [startT, setStartT] = useState("");
  const [endT, setEndT] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  // 기록 리스트
  const [records, setRecords] = useState<FieldIncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 차트 기간
  const [chartDays, setChartDays] = useState<7 | 30>(7);

  const fetchRecords = async () => {
    if (!user) return;
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const { data } = await supabase
      .from("field_income_records")
      .select("*")
      .eq("user_id", user.id)
      .gte("recorded_date", since.toISOString().split("T")[0])
      .order("recorded_date", { ascending: false });
    setRecords((data as FieldIncomeRecord[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchRecords(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // 소득 실시간 미리보기
  const dailyIncome = useMemo(() => {
    const s = parseInt(startT);
    const e = parseInt(endT);
    if (!s || !e) return null;
    return e - s;
  }, [startT, endT]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const s = parseInt(startT);
    const ed = parseInt(endT);
    if (!s && s !== 0) {
      toast("시작 보유 T를 입력하세요.", "error");
      return;
    }
    if (!ed && ed !== 0) {
      toast("최종 보유 T를 입력하세요.", "error");
      return;
    }
    const earned = ed - s;
    setSaving(true);
    const { error } = await supabase.from("field_income_records").insert({
      user_id: user.id,
      dungeon_name: region,
      start_t: s,
      end_t: ed,
      earned_t: earned,
      memo: memo || null,
    });
    setSaving(false);
    if (error) {
      toast("저장 실패: " + error.message, "error");
      return;
    }
    toast("소득 기록이 저장되었습니다.", "success");
    setStartT("");
    setEndT("");
    setMemo("");
    fetchRecords();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("field_income_records")
      .delete()
      .eq("id", id);
    if (error) {
      toast("삭제 실패", "error");
      return;
    }
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // 차트 데이터 (일별 합산)
  const chartData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - chartDays);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const map = new Map<string, number>();
    for (let i = 0; i < chartDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().split("T")[0], 0);
    }
    for (const r of records) {
      if (r.recorded_date >= cutoffStr) {
        map.set(r.recorded_date, (map.get(r.recorded_date) || 0) + r.earned_t);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({
        date: date.slice(5),
        total,
      }));
  }, [records, chartDays]);

  const totalIncome = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - chartDays);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return records
      .filter((r) => r.recorded_date >= cutoffStr)
      .reduce((sum, r) => sum + r.earned_t, 0);
  }, [records, chartDays]);

  // 날짜별 그룹핑
  const groupedRecords = useMemo(() => {
    const groups: Record<string, FieldIncomeRecord[]> = {};
    for (const r of records.slice(0, 50)) {
      const date = r.recorded_date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(r);
    }
    return Object.entries(groups);
  }, [records]);

  if (authLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="rounded-2xl h-48 shimmer" />
        </main>
      </div>
    );
  }

  if (!user || !profile?.verified) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-8 text-center text-gbus-text-muted">
          로그인이 필요합니다.
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-2xl mx-auto px-4 py-8 animate-fade-up space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2.5">
          <span className="w-1.5 h-5 bg-gbus-primary rounded-full" />
          소득 기록
        </h1>

        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
          <div className="text-sm font-semibold text-gbus-text-muted mb-2">1일 소득 기록</div>

          {/* 지역 선택 칩 */}
          <div>
            <label className="text-sm font-medium text-gbus-text-muted mb-2 block">지역</label>
            <div className="flex flex-wrap gap-1.5">
              {INCOME_REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRegion(r)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                    region === r
                      ? "bg-gbus-accent/15 text-gbus-accent border-gbus-accent/30"
                      : "bg-gbus-surface-light/40 text-gbus-text-muted border-gbus-border/40 hover:text-gbus-text"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="시작 보유 T"
              type="number"
              placeholder="사냥 전 보유 T"
              value={startT}
              onChange={(e) => setStartT(e.target.value)}
              required
            />
            <Input
              label="최종 보유 T"
              type="number"
              placeholder="사냥 후 보유 T"
              value={endT}
              onChange={(e) => setEndT(e.target.value)}
              required
            />
          </div>

          {/* 실시간 소득 미리보기 */}
          {dailyIncome !== null && (
            <div className={`text-center py-2 rounded-xl border ${
              dailyIncome >= 0
                ? "bg-gbus-success/5 border-gbus-success/20 text-gbus-success"
                : "bg-gbus-danger/5 border-gbus-danger/20 text-gbus-danger"
            }`}>
              <span className="text-xs text-gbus-text-dim">1일 소득: </span>
              <span className="font-bold text-lg">
                {dailyIncome >= 0 ? "+" : ""}{dailyIncome.toLocaleString()} T
              </span>
            </div>
          )}

          <Input
            label="메모"
            placeholder="선택사항"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />

          <Button type="submit" loading={saving} className="w-full">
            기록 저장
          </Button>
        </form>

        {/* 차트 */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-semibold text-gbus-text-muted">소득 추이</div>
              <div className="text-xl font-bold text-gbus-primary-light mt-1">
                {totalIncome.toLocaleString()} T
                <span className="text-xs text-gbus-text-dim ml-2">최근 {chartDays}일</span>
              </div>
            </div>
            <div className="flex gap-1">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setChartDays(d)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                    chartDays === d
                      ? "bg-gbus-primary/15 text-gbus-primary-light border-gbus-primary/30"
                      : "bg-gbus-surface-light/40 text-gbus-text-muted border-gbus-border/40"
                  }`}
                >
                  {d}일
                </button>
              ))}
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(30,26,50,0.95)",
                    border: "1px solid rgba(124,109,240,0.3)",
                    borderRadius: 12,
                    color: "#e8e4f0",
                    fontSize: 13,
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((value: any) => [`${(value ?? 0).toLocaleString()} T`, "소득"]) as any}
                />
                <Bar dataKey="total" fill="rgba(124,109,240,0.7)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 최근 기록 리스트 */}
        <div className="glass rounded-2xl p-6">
          <div className="text-sm font-semibold text-gbus-text-muted mb-4">최근 기록</div>
          {loading ? (
            <div className="text-center py-8 text-gbus-text-dim">로딩 중...</div>
          ) : groupedRecords.length === 0 ? (
            <div className="text-center py-8 text-gbus-text-dim">기록이 없습니다.</div>
          ) : (
            <div className="space-y-4">
              {groupedRecords.map(([date, recs]) => (
                <div key={date}>
                  <div className="text-xs text-gbus-text-dim mb-2 font-medium">
                    {new Date(date + "T00:00:00").toLocaleDateString("ko-KR", {
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}
                    <span className="ml-2 text-gbus-primary-light">
                      {recs.reduce((s, r) => s + r.earned_t, 0).toLocaleString()} T
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {recs.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between bg-gbus-surface-light/30 rounded-xl px-3 py-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-medium text-gbus-accent whitespace-nowrap">
                            {r.dungeon_name}
                          </span>
                          <span className={`text-sm font-bold ${r.earned_t >= 0 ? "text-gbus-success" : "text-gbus-danger"}`}>
                            {r.earned_t >= 0 ? "+" : ""}{r.earned_t.toLocaleString()} T
                          </span>
                          {r.start_t != null && r.end_t != null && (
                            <span className="text-xs text-gbus-text-dim">
                              {r.start_t.toLocaleString()} → {r.end_t.toLocaleString()}
                            </span>
                          )}
                          {r.memo && (
                            <span className="text-xs text-gbus-text-dim truncate">
                              {r.memo}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="text-xs text-gbus-text-dim hover:text-gbus-danger transition-colors ml-2 flex-shrink-0"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
