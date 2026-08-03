/* Service worker: deja la app funcionando sin señal.

   La pagina va a RED PRIMERO, con la cache como paracaidas: con internet siempre
   ves la version al dia, y sin internet abre igual con la ultima que se guardo.
   Si la red tarda mas de 3 segundos, no te deja esperando: sirve la copia local.

   El nombre de la cache lleva el hash del archivo, asi que cada version nueva
   estrena cache y borra la anterior. Los datos de asistencia NO pasan por aca:
   viven en el dispositivo. */
const CACHE = "asistencia-a729f5c3857d";
const ARCHIVOS = ["./", "./index.html", "./manifest.webmanifest"];
const ESPERA_MAXIMA = 3000;

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function guardar(pedido, resp) {
  if (resp && resp.status === 200 && resp.type === "basic") {
    const copia = resp.clone();
    caches.open(CACHE).then((c) => c.put(pedido, copia));
  }
  return resp;
}

self.addEventListener("fetch", (ev) => {
  if (ev.request.method !== "GET") return;
  const esPagina = ev.request.mode === "navigate" ||
                   ev.request.destination === "document";

  if (esPagina) {
    ev.respondWith((async () => {
      const desdeCache = () => caches.match(ev.request).then((x) => x || caches.match("./index.html"));
      const red = fetch(ev.request).then((r) => guardar(ev.request, r));
      const reloj = new Promise((r) => setTimeout(() => r("tarde"), ESPERA_MAXIMA));
      try {
        const primero = await Promise.race([red, reloj]);
        if (primero !== "tarde") return primero;
        return (await desdeCache()) || red;      // la red sigue, pero no te hago esperar
      } catch (e) {
        return (await desdeCache()) || Response.error();
      }
    })());
    return;
  }

  ev.respondWith(
    caches.match(ev.request).then((guardada) =>
      guardada || fetch(ev.request).then((r) => guardar(ev.request, r)))
  );
});
