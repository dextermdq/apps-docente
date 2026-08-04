/* Red primero, cache como paracaidas: con internet ves siempre la version al
   dia, y sin internet abre igual. El nombre lleva el hash del archivo, asi cada
   version nueva estrena cache y borra la anterior. */
const CACHE = "notas-0c12244b8f17";
const ARCHIVOS = ["./", "./index.html", "./manifest.webmanifest"];
const ESPERA = 3000;
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function guardar(req, resp) {
  if (resp && resp.status === 200 && resp.type === "basic") {
    const copia = resp.clone();
    caches.open(CACHE).then((c) => c.put(req, copia));
  }
  return resp;
}
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const esPagina = e.request.mode === "navigate" || e.request.destination === "document";
  if (esPagina) {
    e.respondWith((async () => {
      const cache = () => caches.match(e.request).then((x) => x || caches.match("./index.html"));
      const red = fetch(e.request).then((r) => guardar(e.request, r));
      try {
        const primero = await Promise.race([red, new Promise((r) => setTimeout(() => r("tarde"), ESPERA))]);
        if (primero !== "tarde") return primero;
        return (await cache()) || red;
      } catch (err) { return (await cache()) || Response.error(); }
    })());
    return;
  }
  e.respondWith(caches.match(e.request).then((g) => g || fetch(e.request).then((r) => guardar(e.request, r))));
});
