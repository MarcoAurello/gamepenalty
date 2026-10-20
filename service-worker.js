// Guarda os arquivos do jogo para funcionar offline.
// Ao publicar uma versão nova, aumente a VERSAO e o ?v= no index.html.
const VERSAO = 'goleiro-orelha-v1';

const ARQUIVOS = [
  './',
  './index.html',
  './style.css?v=1',
  './dados.js?v=1',
  './jogo.js?v=1',
  './manifest.json',
  './personagens/orelha/sprites.png',
  './personagens/orelha/capa.png',
  './personagens/orelha-atacante/sprites.png',
  './personagens/rival-goleiro/sprites.png',
  './personagens/rival-atacante/sprites.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((nomes) => Promise.all(nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // fontes do Google: guarda na primeira vez para usar offline
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.open(VERSAO + '-fontes').then(async (cache) => {
      const salvo = await cache.match(e.request);
      if (salvo) return salvo;
      const r = await fetch(e.request);
      cache.put(e.request, r.clone());
      return r;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // sempre confere com o servidor; sem internet, usa o que está guardado
  const pedido = e.request.mode === 'navigate' ? e.request : new Request(e.request, { cache: 'no-cache' });
  e.respondWith(
    fetch(pedido).then((r) => {
      if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(e.request, copia)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
