const CACHE_NAME = "gbus-v2";
const PRECACHE_URLS = ["/", "/dashboard", "/login"];

// 설치: 핵심 페이지 프리캐시
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 삭제
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 요청: Network-first (온라인이면 네트워크, 오프라인이면 캐시)
self.addEventListener("fetch", (event) => {
  // API/Supabase 요청은 캐싱하지 않음
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("supabase.co") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 성공 응답은 캐시에 저장
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// === 브라우저 알림 지원 ===

// 클라이언트 페이지에서 알림 요청 수신
self.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, body, tag, icon, url } = event.data.payload;
    self.registration.showNotification(title, {
      body,
      tag,
      icon: icon || "/icons/icon-192.png",
      data: { url },
    });
  }
});

// === 서버 Push 수신 ===
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const { title, body, tag, url } = payload;
    event.waitUntil(
      self.registration.showNotification(title || "G-BUS", {
        body: body || "",
        tag: tag || "gbus-push",
        icon: "/icons/icon-192.png",
        data: { url: url || "/dashboard" },
      })
    );
  } catch {
    event.waitUntil(
      self.registration.showNotification("G-BUS", {
        body: event.data.text(),
        icon: "/icons/icon-192.png",
        data: { url: "/dashboard" },
      })
    );
  }
});

// 알림 클릭: 기존 탭 포커스 또는 새 탭 열기
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          if (url) client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
