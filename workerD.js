let Service;
const DB = {
    db: null,
    open: sqlite => {
        DB.db = new sqlite.oo1.OpfsDb('mydb.sqlite3');
        let [table] = DB.SQL(`SELECT name FROM sqlite_master WHERE type='table' AND name='original'`);
        table || DB.init(new URLSearchParams(self.location.href).get('key'));
    },
    SQL: sql => DB.db.exec({ sql, rowMode: 'object' }),

    init: key => Promise.resolve(self.postMessage('Initializing'))
        .then(() => fetch('large.sql')).then(resp => resp.text())
        .then(sql => {
            DB.SQL(key ? CryptoJS.AES.decrypt(sql, key).toString(CryptoJS.enc.Utf8) : sql);
            self.postMessage(`Done: ${DB.SQL('SELECT count(*) from original')[0]['count(*)']}`);
        })
        .catch(er => self.postMessage('Error') ?? console.error(er) ?? DB.discard()),

    discard: () => DB.SQL('DROP table original'),
};
const API = req => {
    try {
        if (req.includes('/api/reset/'))
            return Service.postMessage(DB.discard());
        if (req.includes('/api/get/'))
            return Service.postMessage(DB.SQL(`SELECT * from original order by random() limit 1`));
        if (/\/api\/get\/[\d,]+$/.test(req))
            return Service.postMessage(DB.SQL(`SELECT * from original where id in (${/[\d,]+$/.exec(req)})`));
        if (/\/sql/.test(req))
            return Service.postMessage(DB.SQL(decodeURIComponent(req.match(/(?<=sql\/).+/)) + ' limit 1000'));
    }
    catch (er) {
        return console.error(er) ?? Service.postMessage(er);
    }
    return Service.postMessage(404);
}

importScripts('jswasm/sqlite3.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');

self.onmessage = ev => (Service = ev.ports[0]).onmessage = ev => API(ev.data);
self.sqlite3InitModule().then(DB.open).catch(er => (console.error(er), self.postMessage(0)))//.finally(() => db.close());
