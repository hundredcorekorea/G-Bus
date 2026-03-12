"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast, ToastContainer } from "@/components/ui/Toast";
import Link from "next/link";
import type { Notice, NoticeCategory } from "@/lib/types";

const CATEGORIES: { key: NoticeCategory | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "notice", label: "공지" },
  { key: "event", label: "이벤트" },
  { key: "update", label: "업데이트" },
];

const categoryVariant: Record<NoticeCategory, "danger" | "warning" | "accent"> = {
  notice: "danger",
  event: "warning",
  update: "accent",
};
const categoryLabel: Record<NoticeCategory, string> = {
  notice: "공지",
  event: "이벤트",
  update: "업데이트",
};

type NoticeWithAuthor = Notice & { author: { nickname: string; game_nickname: string } };

export default function NoticesPage() {
  const { user, profile } = useAuth();
  const [notices, setNotices] = useState<NoticeWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<NoticeCategory | "all">("all");
  const supabase = createClient();

  const canWrite = profile?.is_admin || profile?.is_moderator || profile?.is_influencer;

  const fetchNotices = async () => {
    let query = supabase
      .from("notices")
      .select("*, author:users!notices_author_id_fkey(nickname, game_nickname)")
      .eq("active", true)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (activeCategory !== "all") {
      query = query.eq("category", activeCategory);
    }

    const { data } = await query;
    setNotices((data as NoticeWithAuthor[]) || []);
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { fetchNotices(); }, [activeCategory]);

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) { toast("삭제 실패: " + error.message, "error"); return; }
    toast("삭제되었습니다.", "success");
    fetchNotices();
  };

  return (
    <div className="min-h-screen">
      <Header />
      <ToastContainer />
      <main className="max-w-3xl mx-auto px-4 py-8 animate-fade-up">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <span className="w-1.5 h-6 bg-gbus-warning rounded-full" />
            공지사항
          </h1>
          {canWrite && (
            <Link href="/notices/new">
              <Button size="sm">글 작성</Button>
            </Link>
          )}
        </div>

        {/* 카테고리 탭 */}
        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeCategory === cat.key
                  ? "bg-gbus-primary text-white shadow-[0_2px_12px_rgba(108,92,231,0.3)]"
                  : "glass text-gbus-text-muted hover:text-gbus-text hover:bg-gbus-surface-light/60"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gbus-text-muted">로딩 중...</div>
        ) : notices.length === 0 ? (
          <div className="text-center py-12 text-gbus-text-muted">등록된 공지가 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {notices.map((n) => (
              <div key={n.id} className={`glass rounded-2xl p-5 ${n.pinned ? "border-l-4 border-l-gbus-warning" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {n.pinned && <Badge variant="warning">고정</Badge>}
                      <Badge variant={categoryVariant[n.category]}>{categoryLabel[n.category]}</Badge>
                      <span className="font-bold text-gbus-text">{n.title}</span>
                    </div>
                    <p className="text-sm text-gbus-text-muted whitespace-pre-wrap line-clamp-3">{n.content}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-gbus-text-dim">
                      <span>{n.author?.game_nickname || n.author?.nickname}</span>
                      <span>{new Date(n.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  {user && (n.author_id === user.id || profile?.is_admin || profile?.is_moderator) && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Link href={`/notices/${n.id}/edit`}>
                        <Button variant="ghost" size="sm">수정</Button>
                      </Link>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(n.id)}>삭제</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
