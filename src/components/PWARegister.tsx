"use client";

import { useEffect, useState } from "react";
import { requestNotificationPermission, subscribeToPush } from "@/lib/notifications";

export function PWARegister() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // 이미 granted 상태면 push 구독 시도 (Phase 2 이전에 허용한 유저 대응)
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      subscribeToPush().catch(() => {});
    }

    // 알림 권한이 아직 요청 안 된 상태 + 유저가 배너를 닫지 않은 경우
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default" &&
      !localStorage.getItem("gbus-notif-dismissed")
    ) {
      const timer = setTimeout(() => setShowBanner(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAllow = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      subscribeToPush().catch(() => {});
    }
    setShowBanner(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("gbus-notif-dismissed", "1");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl border border-gbus-primary/30 bg-gbus-surface/95 backdrop-blur-md p-4 shadow-lg animate-fade-up">
      <p className="text-sm text-gbus-text font-medium mb-1">알림을 받으시겠어요?</p>
      <p className="text-xs text-gbus-text-dim mb-3">
        내 순번이 가까워지면 브라우저 알림으로 알려드립니다.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleAllow}
          className="flex-1 rounded-lg bg-gbus-primary px-3 py-2 text-sm font-medium text-white transition-all hover:bg-gbus-primary-dim"
        >
          알림 허용
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-lg px-3 py-2 text-sm text-gbus-text-dim hover:text-gbus-text transition-all"
        >
          나중에
        </button>
      </div>
    </div>
  );
}
