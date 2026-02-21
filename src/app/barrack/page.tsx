"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { toast, ToastContainer } from "@/components/ui/Toast";
import type { Barrack } from "@/lib/types";

export default function BarrackPage() {
  const { user } = useAuth();
  const [barracks, setBarracks] = useState<Barrack[]>([]);
  const [newName, setNewName] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkNames, setBulkNames] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchBarracks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("barracks")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order");
    setBarracks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchBarracks();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    if (!newName.trim() || !user) return;
    const { error } = await supabase.from("barracks").insert({
      user_id: user.id,
      char_name: newName.trim(),
      sort_order: barracks.length,
    });
    if (error) {
      toast(error.message.includes("unique") ? "이미 등록된 닉네임입니다." : error.message, "error");
      return;
    }
    setNewName("");
    toast("캐릭터가 추가되었습니다.", "success");
    fetchBarracks();
  };

  const handleBulkAdd = async () => {
    if (!bulkNames.trim() || !user) return;
    const names = bulkNames
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (names.length === 0) return;

    const inserts = names.map((name, i) => ({
      user_id: user.id,
      char_name: name,
      sort_order: barracks.length + i,
    }));

    const { error } = await supabase.from("barracks").insert(inserts);
    if (error) {
      toast("일괄 등록 실패: " + error.message, "error");
      return;
    }
    setBulkNames("");
    setBulkMode(false);
    toast(`${names.length}개 캐릭터가 추가되었습니다.`, "success");
    fetchBarracks();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("barracks").delete().eq("id", id);
    toast("삭제되었습니다.", "info");
    fetchBarracks();
  };

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">배럭 관리</h1>
        <p className="text-sm text-gbus-text-muted mb-6">
          내 캐릭터 닉네임을 등록해두면 예약 시 편리하게 선택할 수 있습니다.
        </p>

        {/* 추가 */}
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">캐릭터 추가</h3>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className="text-xs text-gbus-primary hover:underline cursor-pointer"
            >
              {bulkMode ? "단일 추가" : "일괄 추가"}
            </button>
          </div>

          {bulkMode ? (
            <div className="flex flex-col gap-3">
              <textarea
                className="w-full px-3 py-2 bg-gbus-bg border border-gbus-border rounded-lg text-gbus-text placeholder:text-gbus-text-dim text-sm min-h-[100px] focus:outline-none focus:border-gbus-primary"
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                placeholder={"닉네임1\n닉네임2\n닉네임3\n(줄바꿈 또는 쉼표로 구분)"}
              />
              <Button onClick={handleBulkAdd}>일괄 추가</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="캐릭터 닉네임"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
                className="flex-1"
              />
              <Button onClick={handleAdd}>추가</Button>
            </div>
          )}
        </Card>

        {/* 목록 */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">
              내 배럭 <span className="text-gbus-text-dim">({barracks.length})</span>
            </h3>
          </div>

          {loading ? (
            <div className="py-6 text-center text-gbus-text-muted text-sm">로딩 중...</div>
          ) : barracks.length === 0 ? (
            <div className="py-6 text-center text-gbus-text-muted text-sm">
              등록된 캐릭터가 없습니다.
            </div>
          ) : (
            <div className="space-y-1">
              {barracks.map((b, i) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between px-3 py-2 bg-gbus-surface-light rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gbus-text-dim w-6">{i + 1}</span>
                    <span className="text-sm">{b.char_name}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-xs text-gbus-danger hover:underline cursor-pointer"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
