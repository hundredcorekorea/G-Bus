"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import type { AdEntry } from "@/lib/types";

export default function AdminAdsPage() {
  const [ads, setAds] = useState<AdEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    app_name: "",
    title: "",
    description: "",
    img_url: "",
    link: "",
    placement: "waiting" as AdEntry["placement"],
    priority: 0,
  });
  const supabase = createClient();

  const fetchAds = async () => {
    const { data } = await supabase
      .from("ads_manager")
      .select("*")
      .order("priority", { ascending: false });
    setAds(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAds(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("ads_manager").insert({
      ...form,
      img_url: form.img_url || null,
    });
    if (error) { toast("생성 실패: " + error.message, "error"); return; }
    toast("광고가 생성되었습니다.", "success");
    setShowForm(false);
    setForm({ app_name: "", title: "", description: "", img_url: "", link: "", placement: "waiting", priority: 0 });
    fetchAds();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("ads_manager").update({ active: !active }).eq("id", id);
    fetchAds();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await supabase.from("ads_manager").delete().eq("id", id);
    toast("삭제되었습니다.", "success");
    fetchAds();
  };

  const placementLabel = { waiting: "대기 화면", settlement: "정산 화면", notification: "알림 센터" };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">광고 관리</h1>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "닫기" : "+ 새 광고"}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-gbus-surface border border-gbus-border rounded-xl p-5 mb-6 grid grid-cols-2 gap-4">
            <Input label="앱 이름" value={form.app_name} onChange={(e) => setForm({ ...form, app_name: e.target.value })} required />
            <Input label="제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <Input label="설명" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="col-span-2" required />
            <Input label="이미지 URL (선택)" value={form.img_url} onChange={(e) => setForm({ ...form, img_url: e.target.value })} />
            <Input label="링크" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gbus-text-muted">위치</label>
              <select
                className="w-full px-3 py-2 bg-gbus-surface border border-gbus-border rounded-lg text-gbus-text"
                value={form.placement}
                onChange={(e) => setForm({ ...form, placement: e.target.value as AdEntry["placement"] })}
              >
                <option value="waiting">대기 화면</option>
                <option value="settlement">정산 화면</option>
                <option value="notification">알림 센터</option>
              </select>
            </div>
            <Input label="우선순위" type="number" value={String(form.priority)} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
            <div className="col-span-2">
              <Button type="submit" className="w-full">생성</Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-12 text-gbus-text-muted">로딩 중...</div>
        ) : (
          <div className="space-y-3">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-gbus-surface border border-gbus-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{ad.app_name}</span>
                    <Badge variant={ad.active ? "success" : "default"}>
                      {ad.active ? "활성" : "비활성"}
                    </Badge>
                    <Badge>{placementLabel[ad.placement]}</Badge>
                  </div>
                  <p className="text-sm text-gbus-text-muted">{ad.title}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleToggle(ad.id, ad.active)}>
                    {ad.active ? "비활성" : "활성"}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(ad.id)}>
                    삭제
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
