self.addEventListener('install', ev => self.skipWaiting());
self.addEventListener('activate', ev => ev.waitUntil(clients.claim()));
self.addEventListener('fetch', ev => ev.respondWith(API(ev.request).catch(er => console.error(er))));

self.onmessage = ev => DB = Object.assign(ev.ports[0], {
    query: url => new Promise(res => {
        DB.postMessage(url);
        DB.addEventListener('message', ev => res(ev.data), {once: true});
    }),
    onmessage: ev => {},
});

let DB;
const API = async req => {
    const {host, pathname} = new URL(req.url);
    if (/^\/(?:api|sql)\//.test(pathname))
        return DB.query(pathname).then((data) => typeof data == 'number' ? 
            new Response('', {status: data}) : Function.prototype.call.bind(Object.prototype.toString)(data) == '[object Error]' ? 
            new Response(data, {status: 500}) :
            new Response(JSON.stringify(data))).catch(er => console.error(er));

    if (req.cache === "only-if-cached" && req.mode !== "same-origin") return;
      
    return fetch(req).then(res => {
        if (res.status === 0) return res;
        const headers = new Headers(res.headers);
        headers.set("Cross-Origin-Embedder-Policy", "require-corp"); 
        headers.set("Cross-Origin-Opener-Policy", "same-origin");
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    });
}