const CACHE_NAME = "gbus-v1";
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
