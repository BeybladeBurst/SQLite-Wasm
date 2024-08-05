let workerS;
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
const API = url => {
    try {
        if (url.includes('/api/reset/'))
            return workerS.postMessage(DB.discard());
        if (url.includes('/api/get/'))
            return workerS.postMessage(DB.SQL(`SELECT * from original order by random() limit 1`));
        if (/\/api\/get\/[\d,]+$/.test(url))
            return workerS.postMessage(DB.SQL(`SELECT * from original where id in (${/[\d,]+$/.exec(url)})`));
        if (/\/sql/.test(url))
            return workerS.postMessage(DB.SQL(decodeURIComponent(url.match(/(?<=sql\/).+/)) + ' limit 1000'));
    }
    catch (er) {
        return console.error(er) ?? workerS.postMessage(er);
    }
    return workerS.postMessage(404);
}

importScripts('jswasm/sqlite3.js');
importScripts('https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js');

self.onmessage = ev => (workerS = ev.ports[0]).onmessage = ev => API(ev.data);
self.sqlite3InitModule().then(DB.open).catch(er => (console.error(er), self.postMessage(0)))//.finally(() => db.close());
