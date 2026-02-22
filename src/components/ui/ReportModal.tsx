"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { REPORT_CATEGORIES, DISCORD_INVITE_URL, type ReportCategory } from "@/lib/constants";

interface ReportModalProps {
  targetName: string;
  targetUserId: string;
  reporterId: string;
  sessionId?: string;
  onClose: () => void;
}

export function ReportModal({ targetName, targetUserId, reporterId, sessionId, onClose }: ReportModalProps) {
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const handleSubmit = async () => {
    if (!category) { toast("신고 유형을 선택하세요.", "error"); return; }
    if (reason.trim().length < 10) { toast("신고 사유를 10자 이상 작성하세요.", "error"); return; }

    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: reporterId,
      reported_id: targetUserId,
      session_id: sessionId || null,
      category,
      reason: reason.trim(),
    });
    setSubmitting(false);

    if (error) {
      toast("신고 접수 실패: " + error.message, "error");
      return;
    }
    toast("신고가 접수되었습니다. 관리자가 확인 후 조치합니다.", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md glass rounded-2xl p-6 animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2.5">
          <span className="w-1.5 h-5 bg-gbus-danger rounded-full" />
          유저 신고
        </h2>
        <p className="text-sm text-gbus-text-muted mb-5">
          대상: <span className="text-gbus-text font-semibold">{targetName}</span>
        </p>

        {/* 카테고리 선택 */}
        <label className="text-xs font-semibold text-gbus-text-muted block mb-2">신고 유형 *</label>
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {(Object.entries(REPORT_CATEGORIES) as [ReportCategory, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`px-3 py-2 text-xs rounded-lg border transition-all cursor-pointer font-medium ${
                category === key
                  ? "bg-gbus-danger/15 border-gbus-danger/40 text-gbus-danger"
                  : "border-gbus-border/40 text-gbus-text-dim hover:text-gbus-text-muted hover:border-gbus-border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 사유 작성 */}
        <label className="text-xs font-semibold text-gbus-text-muted block mb-2">신고 사유 * <span className="font-normal text-gbus-text-dim">(10자 이상)</span></label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="구체적인 상황을 작성해 주세요. 허위 신고는 역제재 대상입니다."
          rows={4}
          className="w-full px-4 py-3 bg-gbus-bg/40 border border-gbus-border/40 rounded-xl text-sm text-gbus-text placeholder:text-gbus-text-dim focus:outline-none focus:border-gbus-primary focus:ring-2 focus:ring-gbus-primary/15 transition-all resize-none"
        />
        <p className="text-[10px] text-gbus-text-dim mt-1 mb-4">{reason.trim().length}/10자 이상</p>

        {/* 디스코드 스크린샷 안내 */}
        <div className="bg-gbus-accent/5 border border-gbus-accent/20 rounded-xl p-3 mb-5">
          <p className="text-xs text-gbus-accent font-semibold mb-1">증거 스크린샷 안내</p>
          <p className="text-[11px] text-gbus-text-muted leading-relaxed">
            신고 처리를 위해 관련 스크린샷을{" "}
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="text-gbus-accent hover:text-gbus-accent-light font-medium underline">
              디스코드
            </a>
            {" "}#신고 채널에 올려주세요.
            스크린샷이 없는 신고는 처리가 지연될 수 있습니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <Button
            variant="danger"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!category || reason.trim().length < 10}
            className="flex-1"
          >
            신고하기
          </Button>
          <Button variant="ghost" onClick={onClose}>취소</Button>
        </div>
      </div>
    </div>
  );
}
