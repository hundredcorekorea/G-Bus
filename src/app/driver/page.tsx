"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast, ToastContainer } from "@/components/ui/Toast";
import type { DriverCustomer } from "@/lib/types";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

type TabKey = "customers" | "income" | "passengers";

const TABS: { key: TabKey; label: string }[] = [
  { key: "customers", label: "손님 관리" },
  { key: "income", label: "수입 그래프" },
  { key: "passengers", label: "승객 분석" },
];

const PIE_COLORS = [
  "#7c6df0", "#6cc4e8", "#f0a05c", "#e86c8a", "#6cf0b0",
  "#c86cf0", "#f0e46c", "#6c8ae8", "#e8c46c", "#8ae86c",
  "#f06cc4", "#6cf0e4",
];

interface IncomeSummary {
  income_date: string;
  total_income: number;
  session_count: number;
}

interface CustomerStat {
  customer_id: string;
  game_nickname: string;
  visit_count: number;
  noshow_count: number;
  done_count: number;
  last_visit: string;
}

interface PassengerRatio {
  dungeon_name: string;
  passenger_count: number;
  pct: number;
}

export default function DriverPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabKey>("customers");

  // Tab 1: 손님 관리
  const [customers, setCustomers] = useState<DriverCustomer[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStat[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");

  // Tab 2: 수입 그래프
  const [incomeSummary, setIncomeSummary] = useState<IncomeSummary[]>([]);
  const [incomeDays, setIncomeDays] = useState<7 | 30 | 90>(30);
  const [incomeLoading, setIncomeLoading] = useState(false);

  // Tab 3: 승객 분석
  const [passengerData, setPassengerData] = useState<PassengerRatio[]>([]);
  const [passengerDays, setPassengerDays] = useState<7 | 30>(30);
  const [passengerLoading, setPassengerLoading] = useState(false);

  // ===== Tab 1: 손님 관리 =====
  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    setCustomersLoading(true);
    const [custRes, statsRes] = await Promise.all([
      supabase
        .from("driver_customers")
        .select("*, customer:users!driver_customers_customer_id_fkey(game_nickname, nickname)")
        .eq("driver_id", user.id)
        .order("session_count", { ascending: false }),
      supabase.rpc("get_driver_customer_stats", { p_driver_id: user.id, p_days: 90 }),
    ]);
    setCustomers((custRes.data as DriverCustomer[]) || []);
    setCustomerStats((statsRes.data as CustomerStat[]) || []);
    setCustomersLoading(false);
  }, [user, supabase]);

  // 동기화: 기존 세션 기록에서 고객 목록 자동 생성
  const handleSync = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const stats = customerStats;
      let added = 0;
      for (const stat of stats) {
        const { error } = await supabase.from("driver_customers").upsert(
          {
            driver_id: user.id,
            customer_id: stat.customer_id,
            nickname: stat.game_nickname,
            session_count: Number(stat.visit_count),
            last_session_at: stat.last_visit,
          },
          { onConflict: "driver_id,customer_id" }
        );
        if (!error) added++;
      }
      toast(`${added}명 손님 동기화 완료`, "success");
      fetchCustomers();
    } catch {
      toast("동기화 실패", "error");
    }
    setSyncing(false);
  };

  const handleSaveNote = async (custId: string) => {
    const { error } = await supabase
      .from("driver_customers")
      .update({ note: noteValue || null })
      .eq("id", custId);
    if (error) {
      toast("메모 저장 실패", "error");
      return;
    }
    setCustomers((prev) =>
      prev.map((c) => (c.id === custId ? { ...c, note: noteValue || null } : c))
    );
    setEditingNote(null);
    toast("메모 저장 완료", "success");
  };

  const handleRate = async (custId: string, rating: number) => {
    const { error } = await supabase
      .from("driver_customers")
      .update({ rating })
      .eq("id", custId);
    if (error) {
      toast("평점 저장 실패", "error");
      return;
    }
    setCustomers((prev) =>
      prev.map((c) => (c.id === custId ? { ...c, rating } : c))
    );
  };

  // ===== Tab 2: 수입 그래프 =====
  const fetchIncome = useCallback(async () => {
    if (!user) return;
    setIncomeLoading(true);
    const { data } = await supabase.rpc("get_driver_income_summary", {
      p_driver_id: user.id,
      p_days: incomeDays,
    });
    setIncomeSummary((data as IncomeSummary[]) || []);
    setIncomeLoading(false);
  }, [user, incomeDays, supabase]);

  // ===== Tab 3: 승객 분석 =====
  const fetchPassengers = useCallback(async () => {
    if (!user) return;
    setPassengerLoading(true);
    const { data } = await supabase.rpc("get_passenger_ratio", {
      p_driver_id: user.id,
      p_days: passengerDays,
    });
    setPassengerData((data as PassengerRatio[]) || []);
    setPassengerLoading(false);
  }, [user, passengerDays, supabase]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === "customers") fetchCustomers();
    else if (activeTab === "income") fetchIncome();
    else if (activeTab === "passengers") fetchPassengers();
  }, [user, activeTab, fetchCustomers, fetchIncome, fetchPassengers]);

  // 차트 데이터 가공
  const incomeChartData = useMemo(() => {
    // 날짜 채우기
    const map = new Map<string, { total_income: number; session_count: number }>();
    for (let i = 0; i < incomeDays; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      map.set(key, { total_income: 0, session_count: 0 });
    }
    for (const row of incomeSummary) {
      map.set(row.income_date, {
        total_income: Number(row.total_income),
        session_count: Number(row.session_count),
      });
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date: date.slice(5),
        ...vals,
      }));
  }, [incomeSummary, incomeDays]);

  const totalDriverIncome = useMemo(
    () => incomeSummary.reduce((s, r) => s + Number(r.total_income), 0),
    [incomeSummary]
  );
  const totalSessions = useMemo(
    () => incomeSummary.reduce((s, r) => s + Number(r.session_count), 0),
    [incomeSummary]
  );

  // 통계 카드에서 재방문 고객 수
  const returningCustomers = useMemo(
    () => customerStats.filter((c) => c.visit_count > 1).length,
    [customerStats]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="rounded-2xl h-48 shimmer" />
        </main>
      </div>
    );
  }

  if (!user || !profile?.verified) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-8 text-center text-gbus-text-muted">
          로그인이 필요합니다.
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-3xl mx-auto px-4 py-8 animate-fade-up space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2.5">
          <span className="w-1.5 h-5 bg-gbus-primary rounded-full" />
          기사 관리
        </h1>

        {/* 탭 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-gbus-primary text-white shadow-[0_2px_12px_rgba(108,92,231,0.3)]"
                  : "glass text-gbus-text-muted hover:text-gbus-text hover:bg-gbus-surface-light/60"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: 손님 관리 */}
        {activeTab === "customers" && (
          <div className="space-y-4">
            {/* 동기화 버튼 */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gbus-text-muted">
                총 <span className="font-bold text-gbus-text">{customers.length}</span>명
                {returningCustomers > 0 && (
                  <span className="ml-2">
                    재방문 <span className="font-bold text-gbus-accent">{returningCustomers}</span>명
                  </span>
                )}
              </div>
              <Button size="sm" variant="secondary" loading={syncing} onClick={handleSync}>
                세션 기록 동기화
              </Button>
            </div>

            {customersLoading ? (
              <div className="text-center py-8 text-gbus-text-dim">로딩 중...</div>
            ) : customers.length === 0 && customerStats.length === 0 ? (
              <div className="text-center py-12 text-gbus-text-dim">
                <p className="mb-2">아직 손님 기록이 없습니다.</p>
                <p className="text-xs">완료된 세션이 있다면 &ldquo;세션 기록 동기화&rdquo; 버튼을 눌러보세요.</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-8 text-gbus-text-dim">
                <p className="mb-3">{customerStats.length}명의 손님 기록을 발견했습니다.</p>
                <Button size="sm" loading={syncing} onClick={handleSync}>
                  동기화하기
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {customers.map((c) => {
                  const stat = customerStats.find((s) => s.customer_id === c.customer_id);
                  return (
                    <div key={c.id} className="glass rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm">{c.nickname}</span>
                            <Badge variant="default">{c.session_count}회</Badge>
                            {stat && stat.noshow_count > 0 && (
                              <Badge variant="danger">노쇼 {String(stat.noshow_count)}</Badge>
                            )}
                          </div>
                          {/* 별점 */}
                          <div className="flex items-center gap-0.5 mb-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => handleRate(c.id, star)}
                                className={`text-sm transition-colors ${
                                  (c.rating || 0) >= star
                                    ? "text-yellow-400"
                                    : "text-gbus-text-dim/30 hover:text-yellow-400/50"
                                }`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          {/* 메모 */}
                          {editingNote === c.id ? (
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                className="flex-1 text-xs bg-gbus-surface/80 border border-gbus-border/60 rounded-lg px-2 py-1 text-gbus-text"
                                value={noteValue}
                                onChange={(e) => setNoteValue(e.target.value)}
                                placeholder="메모 입력..."
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveNote(c.id)}
                                className="text-xs text-gbus-primary-light hover:underline"
                              >
                                저장
                              </button>
                              <button
                                onClick={() => setEditingNote(null)}
                                className="text-xs text-gbus-text-dim hover:text-gbus-text"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingNote(c.id);
                                setNoteValue(c.note || "");
                              }}
                              className="text-xs text-gbus-text-dim hover:text-gbus-text mt-1"
                            >
                              {c.note || "메모 추가..."}
                            </button>
                          )}
                        </div>
                        {c.last_session_at && (
                          <span className="text-xs text-gbus-text-dim flex-shrink-0">
                            {new Date(c.last_session_at).toLocaleDateString("ko-KR", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: 수입 그래프 */}
        {activeTab === "income" && (
          <div className="space-y-4">
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-xs text-gbus-text-dim mb-1">총 수입</div>
                <div className="text-lg font-bold text-gbus-primary-light">
                  {totalDriverIncome.toLocaleString()} T
                </div>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-xs text-gbus-text-dim mb-1">완료 세션</div>
                <div className="text-lg font-bold text-gbus-accent">
                  {totalSessions}회
                </div>
              </div>
            </div>

            {/* 기간 토글 */}
            <div className="flex justify-end gap-1">
              {([7, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setIncomeDays(d)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                    incomeDays === d
                      ? "bg-gbus-primary/15 text-gbus-primary-light border-gbus-primary/30"
                      : "bg-gbus-surface-light/40 text-gbus-text-muted border-gbus-border/40"
                  }`}
                >
                  {d}일
                </button>
              ))}
            </div>

            {/* 바 차트 */}
            <div className="glass rounded-2xl p-6">
              <div className="text-sm font-semibold text-gbus-text-muted mb-4">일별 수입</div>
              {incomeLoading ? (
                <div className="h-52 rounded-xl shimmer" />
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                      />
                      <YAxis
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                        tickFormatter={(v) =>
                          v >= 1000000
                            ? `${(v / 1000000).toFixed(0)}M`
                            : v >= 1000
                            ? `${(v / 1000).toFixed(0)}k`
                            : v
                        }
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
                        formatter={((value: any, name: any) => [
                          `${(value ?? 0).toLocaleString()} ${name === "total_income" ? "T" : "회"}`,
                          name === "total_income" ? "수입" : "세션",
                        ]) as any}
                      />
                      <Bar dataKey="total_income" fill="rgba(124,109,240,0.7)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: 승객 분석 */}
        {activeTab === "passengers" && (
          <div className="space-y-4">
            {/* 기간 토글 */}
            <div className="flex justify-end gap-1">
              {([7, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setPassengerDays(d)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                    passengerDays === d
                      ? "bg-gbus-primary/15 text-gbus-primary-light border-gbus-primary/30"
                      : "bg-gbus-surface-light/40 text-gbus-text-muted border-gbus-border/40"
                  }`}
                >
                  {d}일
                </button>
              ))}
            </div>

            {passengerLoading ? (
              <div className="h-64 rounded-2xl shimmer" />
            ) : passengerData.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center py-12 text-gbus-text-dim">
                해당 기간의 승객 데이터가 없습니다.
              </div>
            ) : (
              <>
                {/* 파이 차트 */}
                <div className="glass rounded-2xl p-6">
                  <div className="text-sm font-semibold text-gbus-text-muted mb-4">
                    던전별 승객 비율
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={passengerData}
                          dataKey="passenger_count"
                          nameKey="dungeon_name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          label={((props: any) =>
                            `${props.dungeon_name} ${props.pct}%`
                          ) as any}
                          labelLine={{ stroke: "rgba(255,255,255,0.2)" }}
                        >
                          {passengerData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={PIE_COLORS[i % PIE_COLORS.length]}
                              fillOpacity={0.8}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "rgba(30,26,50,0.95)",
                            border: "1px solid rgba(124,109,240,0.3)",
                            borderRadius: 12,
                            color: "#e8e4f0",
                            fontSize: 13,
                          }}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={((value: any) => [`${value ?? 0}명`, "승객"]) as any}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 상세 리스트 */}
                <div className="glass rounded-2xl p-6">
                  <div className="text-sm font-semibold text-gbus-text-muted mb-3">상세</div>
                  <div className="space-y-2">
                    {passengerData.map((d, i) => (
                      <div
                        key={d.dungeon_name}
                        className="flex items-center justify-between bg-gbus-surface-light/30 rounded-xl px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="text-sm font-medium">{d.dungeon_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold">{String(d.passenger_count)}명</span>
                          <span className="text-xs text-gbus-text-dim">{d.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
