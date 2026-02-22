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
  const [newTamerLv, setNewTamerLv] = useState("");
  const [newDigiLv, setNewDigiLv] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkNames, setBulkNames] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editTamerLv, setEditTamerLv] = useState("");
  const [editDigiLv, setEditDigiLv] = useState("");
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
      tamer_lv: newTamerLv ? Number(newTamerLv) : null,
      digi_lv: newDigiLv ? Number(newDigiLv) : null,
      sort_order: barracks.length,
    });
    if (error) {
      toast(error.message.includes("unique") ? "이미 등록된 닉네임입니다." : error.message, "error");
      return;
    }
    setNewName("");
    setNewTamerLv("");
    setNewDigiLv("");
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
    toast(`${names.length}개 캐릭터가 추가되었습니다. 레벨은 개별 수정해 주세요.`, "success");
    fetchBarracks();
  };

  const startEdit = (b: Barrack) => {
    setEditingId(b.id);
    setEditName(b.char_name);
    setEditTamerLv(b.tamer_lv != null ? String(b.tamer_lv) : "");
    setEditDigiLv(b.digi_lv != null ? String(b.digi_lv) : "");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const { error } = await supabase.from("barracks").update({
      char_name: editName.trim(),
      tamer_lv: editTamerLv ? Number(editTamerLv) : null,
      digi_lv: editDigiLv ? Number(editDigiLv) : null,
    }).eq("id", editingId);
    if (error) {
      toast(error.message.includes("unique") ? "이미 등록된 닉네임입니다." : "수정 실패: " + error.message, "error");
      return;
    }
    setEditingId(null);
    toast("수정되었습니다.", "success");
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
        <p className="text-sm text-gbus-text-muted mb-2">
          내 캐릭터 닉네임과 레벨을 등록해두면 예약 시 편리하게 선택할 수 있습니다.
        </p>
        <div className="flex items-center gap-3 text-[11px] text-gbus-text-dim mb-6">
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gbus-success/80" />주인 레벨</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gbus-warning/70" />하인 레벨</span>
        </div>

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
                placeholder={"닉네임1\n닉네임2\n닉네임3\n(줄바꿈 또는 쉼표로 구분, 레벨은 개별 수정)"}
              />
              <Button onClick={handleBulkAdd}>일괄 추가</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
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
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={newTamerLv}
                  onChange={(e) => setNewTamerLv(e.target.value)}
                  placeholder="주인 Lv"
                  className="flex-1"
                />
                <Input
                  type="number"
                  min={1}
                  value={newDigiLv}
                  onChange={(e) => setNewDigiLv(e.target.value)}
                  placeholder="하인 Lv"
                  className="flex-1"
                />
              </div>
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
              {barracks.map((b, i) =>
                editingId === b.id ? (
                  <div key={b.id} className="bg-gbus-primary/5 border border-gbus-primary/20 rounded-lg p-3 space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="캐릭터 닉네임"
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={editTamerLv}
                        onChange={(e) => setEditTamerLv(e.target.value)}
                        placeholder="주인 Lv"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min={1}
                        value={editDigiLv}
                        onChange={(e) => setEditDigiLv(e.target.value)}
                        placeholder="하인 Lv"
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit} className="flex-1">저장</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>취소</Button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={b.id}
                    className="flex items-center justify-between px-3 py-2 bg-gbus-surface-light rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gbus-text-dim w-6 shrink-0">{i + 1}</span>
                      <span className="text-sm font-medium truncate">{b.char_name}</span>
                      {(b.tamer_lv != null || b.digi_lv != null) && (
                        <span className="flex items-center gap-1 shrink-0">
                          {b.tamer_lv != null && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gbus-success/10 text-gbus-success border border-gbus-success/30">
                              {b.tamer_lv}
                            </span>
                          )}
                          {b.digi_lv != null && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gbus-warning/10 text-gbus-warning border border-gbus-warning/30">
                              {b.digi_lv}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(b)}
                        className="text-xs text-gbus-primary hover:underline cursor-pointer"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="text-xs text-gbus-danger hover:underline cursor-pointer"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
