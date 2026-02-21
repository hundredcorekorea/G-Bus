"use client";

import { useEffect, useState, useCallback } from "react";

interface ToastMessage {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

const typeStyles = {
  info: "bg-gbus-primary/90 border-gbus-primary-light/40 shadow-[0_4px_24px_rgba(124,109,240,0.25)]",
  success: "bg-gbus-success/90 border-gbus-success/40 shadow-[0_4px_24px_rgba(85,239,196,0.25)]",
  warning: "bg-gbus-warning/90 border-gbus-warning/40 shadow-[0_4px_24px_rgba(254,202,87,0.25)]",
  error: "bg-gbus-danger/90 border-gbus-danger/40 shadow-[0_4px_24px_rgba(255,107,107,0.25)]",
};

const typeIcons = {
  info: "\u2139\uFE0F",
  success: "\u2705",
  warning: "\u26A0\uFE0F",
  error: "\u274C",
};

// 글로벌 토스트 이벤트
type ToastListener = (toast: ToastMessage) => void;
const listeners: Set<ToastListener> = new Set();

export function toast(message: string, type: ToastMessage["type"] = "info") {
  const t: ToastMessage = { id: Date.now().toString(), message, type };
  listeners.forEach((fn) => fn(t));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((t: ToastMessage) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 4000);
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => { listeners.delete(addToast); };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-enter px-4 py-3 rounded-xl border backdrop-blur-md text-sm text-white font-medium flex items-center gap-2.5 ${typeStyles[t.type]}`}
        >
          <span className="text-base">{typeIcons[t.type]}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
