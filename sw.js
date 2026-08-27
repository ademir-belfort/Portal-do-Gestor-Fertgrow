// Service worker do Portal do Colaborador — só cacheia o "casco" do app (o próprio html + manifest),
// nunca as chamadas ao Supabase (escala, ponto, férias, checklist precisam ser sempre atuais e
// autenticadas). Estratégia network-first: tenta a rede primeiro (pra sempre pegar a versão mais nova
// quando publicada), cai pro cache só se estiver offline.
//
// Pra publicar uma atualização no futuro: suba os arquivos de novo com CACHE_NAME incrementado
// (ex: "fertgrow-portal-v2") — isso invalida o cache antigo automaticamente pros usuários.
const CACHE_NAME = "fertgrow-portal-v1";
const SHELL_FILES = ["./portal_colaborador.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // deixa Supabase e CDNs passarem direto, sem cache
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// Notificação push — avisa o colaborador quando o gestor aprova/rejeita um pedido (disparado pela
// Edge Function "notify-request-status" logo depois que o painel do gestor confirma a mudança).
self.addEventListener("push", (event) => {
  let data = { title: "Fertgrow", body: "Você tem uma atualização." };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("./portal_colaborador.html");
    })
  );
});
