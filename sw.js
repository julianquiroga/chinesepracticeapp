// Service worker: cachea los recursos de la app para que funcione sin conexión
// después de la primera carga (útil para practicar sin datos/wifi). Estrategia:
// stale-while-revalidate — sirve de caché al instante y refresca en segundo plano.
const CACHE_NAME = "gwc-v1";

const SAME_ORIGIN_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./data.js",
  "./hanzi-writer.min.js",
  "./strokes-data.js",
  "./char-pinyin.js",
  "./manifest.json",
];

// Las librerías vienen de un CDN externo; se cachean como respuestas "opacas"
// (no-cors) porque no podemos leer su contenido, pero sí guardarlas para reuso offline.
const CDN_ASSETS = [
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone@7.29.8/babel.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SAME_ORIGIN_ASSETS);
    await Promise.all(CDN_ASSETS.map(async (url) => {
      try {
        const res = await fetch(url, { mode: "no-cors" });
        await cache.put(url, res);
      } catch (e) {
        // sin conexión en la primera carga: se cacheará en la próxima visita online
      }
    }));
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) {
      // Refresca en segundo plano sin bloquear la respuesta actual
      fetch(event.request).then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res));
        }
      }).catch(() => {});
      return cached;
    }
    try {
      return await fetch(event.request);
    } catch (e) {
      return cached || Response.error();
    }
  })());
});
