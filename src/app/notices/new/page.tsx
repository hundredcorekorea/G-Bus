"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast, ToastContainer } from "@/components/ui/Toast";
import type { NoticeCategory } from "@/lib/types";

const CATEGORIES: { key: NoticeCategory; label: string }[] = [
  { key: "notice", label: "공지" },
  { key: "event", label: "이벤트" },
  { key: "update", label: "업데이트" },
];

export default function NewNoticePage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<NoticeCategory>("notice");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  const canWrite = profile?.is_admin || profile?.is_moderator || profile?.is_influencer;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canWrite) { toast("권한이 없습니다.", "error"); return; }
    if (!title.trim() || !content.trim()) { toast("제목과 내용을 입력해 주세요.", "error"); return; }

    setLoading(true);
    const { error } = await supabase.from("notices").insert({
      author_id: user.id,
      title: title.trim(),
      content: content.trim(),
      category,
      pinned: profile?.is_admin ? pinned : false,
    });

    if (error) {
      toast("작성 실패: " + error.message, "error");
      setLoading(false);
      return;
    }

    toast("공지가 등록되었습니다!", "success");
    router.push("/notices");
  };

  if (!canWrite) return (
    <div className="min-h-screen"><Header />
      <div className="flex flex-col items-center justify-center py-20"><p className="text-gbus-text-muted">권한이 없습니다.</p></div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-lg mx-auto px-4 py-8 animate-fade-up">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2.5">
          <span className="w-1.5 h-6 bg-gbus-warning rounded-full" />
          공지 작성
        </h1>

        <div className="glass rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* 카테고리 */}
            <div>
              <label className="text-sm font-semibold text-gbus-text-muted block mb-2.5">카테고리</label>
              <div className="flex gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={`px-4 py-2.5 text-sm rounded-xl transition-all duration-300 cursor-pointer border font-semibold ${
                      category === c.key
                        ? "bg-gbus-primary/15 border-gbus-primary/40 text-gbus-primary-light shadow-[0_0_12px_rgba(108,92,231,0.15)]"
                        : "border-gbus-border/40 text-gbus-text-dim hover:border-gbus-text-dim hover:text-gbus-text-muted"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="공지 제목" required />

            <div>
              <label className="text-sm font-semibold text-gbus-text-muted block mb-2.5">내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="공지 내용을 입력하세요"
                rows={8}
                required
                className="w-full px-4 py-3 bg-gbus-surface border border-gbus-border rounded-xl text-gbus-text placeholder:text-gbus-text-dim focus:outline-none focus:border-gbus-primary transition-all resize-y"
              />
            </div>

            {/* 고정 (admin만) */}
            {profile?.is_admin && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="w-4 h-4 rounded border-gbus-border accent-gbus-warning"
                />
                <span className="text-sm text-gbus-text-muted">상단 고정</span>
              </label>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => router.back()}>
                취소
              </Button>
              <Button type="submit" loading={loading} size="lg" className="flex-1 btn-shine">
                작성
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
