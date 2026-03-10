import { createClient } from "@/lib/supabase/client";

type NotifyOptions = {
  title: string;
  body: string;
  tag?: string;
  onClick?: string;
};

/** Notification API 지원 + 권한 granted 여부 */
export function canNotify(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

/** 알림 권한 요청. granted면 true 반환 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * 브라우저 OS 알림 발송 (탭이 포커스 아닐 때만).
 * SW가 활성화되어 있으면 SW를 통해 showNotification,
 * 없으면 직접 Notification API 사용.
 */
export function sendNotification({ title, body, tag, onClick }: NotifyOptions): void {
  if (!canNotify()) return;
  // 탭이 포커스 상태면 Toast로 이미 보고 있으므로 스킵
  if (document.visibilityState === "visible") return;

  const sw = navigator.serviceWorker?.controller;
  if (sw) {
    sw.postMessage({
      type: "SHOW_NOTIFICATION",
      payload: { title, body, tag, icon: "/icons/icon-192.png", url: onClick },
    });
  } else {
    const n = new Notification(title, {
      body,
      tag,
      icon: "/icons/icon-192.png",
    });
    if (onClick) {
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  }
}

/**
 * Push 구독 생성 후 Supabase에 저장.
 * 알림 권한이 granted 상태일 때 호출.
 */
export async function subscribeToPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (!registration) return false;

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return false;

    // 기존 구독이 있으면 그대로 사용
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;
    const user = session.user;

    await supabase.from("push_subscriptions").upsert({
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    }, { onConflict: "user_id,endpoint" });

    return true;
  } catch {
    return false;
  }
}

/**
 * 서버 Push 발송: 특정 유저에게 백그라운드 push 알림 전송.
 * 브라우저가 꺼져 있거나 다른 앱 사용 중일 때도 도달.
 */
export async function sendPushToUser(
  userId: string,
  opts: { title: string; body: string; tag?: string; url?: string },
): Promise<void> {
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...opts }),
    });
  } catch {
    // 실패해도 UX 차단하지 않음
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
