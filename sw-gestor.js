// Service worker do Fertgrow Gestão — só cacheia o "casco" do app (o próprio html + manifest), nunca as
// chamadas ao Supabase (dados precisam ser sempre atuais e autenticados). Estratégia network-first: tenta
// a rede primeiro (pra sempre pegar a versão mais nova quando publicada), cai pro cache só se offline.
//
// Pra publicar uma atualização no futuro: suba os arquivos de novo com CACHE_NAME incrementado
// (ex: "fertgrow-gestor-v2") — isso invalida o cache antigo automaticamente pros usuários.
const CACHE_NAME = "fertgrow-gestor-v1";
const SHELL_FILES = ["./portal_gestor.html", "./manifest-gestor.json"];

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
