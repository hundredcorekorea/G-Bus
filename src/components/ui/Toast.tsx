"use client";

import { useEffect, useState, useCallback } from "react";

interface ToastMessage {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

const typeClasses = {
  info: "bg-gbus-primary/90 border-gbus-primary-light",
  success: "bg-green-900/90 border-gbus-success",
  warning: "bg-yellow-900/90 border-gbus-warning",
  error: "bg-red-900/90 border-gbus-danger",
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
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-enter px-4 py-3 rounded-lg border text-sm text-white shadow-lg ${typeClasses[t.type]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
