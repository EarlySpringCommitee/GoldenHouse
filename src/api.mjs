import Promise from "bluebird";

import express from "express";
import session from "express-session";
import sqliteSession from "connect-sqlite3";
import helmet from "helmet";
import bodyParser from "body-parser";
import http from "http";

import multer from "multer"

import EPub from 'epub2';

import { fileURLToPath } from "url";
import file from fileURLToPath(`${import.meta.url}/../file.mjs`);
import path from "path"

import db from `${file.rootDir}/src/db.mjs`;

import convert from `${file.rootDir}/src/convert.mjs`

const config = file.config;


const app = express();
const SQLiteStore = sqliteSession(session);
const server = http.createServer(app);
const upload = multer({ dest: file.tmpDir})

const clone = oldObject => JSON.parse(JSON.stringify(oldObject))

app.configure(function() {
    app.use(
        bodyParser.urlencoded({
            extended: true
        })
    );
    app.use(helmet());
    app.use(
        helmet.hidePoweredBy({
            setTo: "PHP 4.2.0"
        })
    );
    app.use(session);
    app.use(
        session({
            store: new SQLiteStore(),
            secret: config.secret,
            cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week
        })
    );
    app.use(express.static(config.storage.public));
});

/* API */
app.get("/series", async (req, res) => {
    let query = {};
    for (const key of ["id", "title", "author", "desc", "cover_id"]) {
        if (req.query[key]) {
            query[key] = req.query[key]
        }
    }
    const result = await db.searchSeries(query);
    res.json(result)
});

app.get("/book", async (req, res) => {
    let query = {};
    for (const key of db.fields.book) {
        if (req.query[key]) {
            query[key] = req.query[key]
        }
    }
    const result = await db.searchBook(query);
    res.json(result)
});

app.post("/series", async (req, res) => {
    const datas = req.body.series;
    const result = datas.map(async x => {
        try {
            const result = await db.addSeries(x)
            return result;
        } catch (e) {
            if (config.debug) {
                return e.message
            } else {
                return false;
            }
        }
        
    })
    res.json(await Promise.all(result));
})

app.post("/book", upload.array("files"), async (req, res) => {
    const files = req.files;
    const datas = req.body.datas;
    const uploadTime = Date.now();
    let result = [];

    for (const i in files) {
        const file = files[i];
        const data = datas[i];
        data.upload_time = uploadTime;
        const seriesName = (await db.searchSeries({ id = data.series_id }))[0].title;
        try {
            switch (file.mimetype) {
                case "application/epub+zip":
                    // Convert to MOBI
                    const mobiTmpPath = await convert(file.path, `${file.path}.mobi`)

                    // Read EPUB meta
                    const meta = (await EPub.createAsync(file.path)).metadata;
                    for (let [key, value] of Object.entries({
                        title: "title",
                        author: "creator",
                        desc: "description"
                    })) {
                        data[key] = meta[value] && meta[value].length ? meta[value] : data[key];
                    }
                    let cover = epub.listImage()
                    if (cover.length) {
                        cover = cover[0];
                        const extName = path.extname(cover.href)
                        const [data, coverMime] = await epub.getImageAsync(cover.id);
                        const cover_id = await file.addImage(data, extName);
                        data.cover_id = cover_id;
                    }

                    const mobiData = clone(data);
                    data.filepath = await file.addEpub(file.path, seriesName, data.no);
                    data.filetype = "epub"

                    mobiData.filepath = await file.addEpub(mobiTmpPath, seriesName, data.no);
                    mobiData.filetype = "mobi"

                    result[i] = {
                        epub: await db.addBook(data),
                        mobi: await db.addBook(modiData)
                    };
                    break;
                case "application/vnd.amazon.ebook":
                case "application/x-mobipocket-ebook":
                    // Read mobi metadata
                    data.filepath = await file.addEpub(mobiTmpPath, seriesName, data.no);
                    data.filetype = "mobi"
                    result[i] = {
                        mobi: await db.addBook(data)
                    };
                    break;
            }
        } catch (e) {
            result[i] = config.debug ? e.message : false;
        }
    }
    return res.json(result);
})

app.patch("/series", async (req, res) => {
    const datas = req.query.series;
    const result = datas.map(async x => {
        try {
            return await db.editSeries(x.id, x)
        } catch (e) {
            if (config.debug) {
                return e.message
            } else {
                return false;
            }
        }
    })
    return res.json(await Promise.all(result));
})

app.patch("/book", async (req, res) => {
    const datas = req.query.book;
    const result = datas.map(async x => {
        try {
            return await db.editBook(x.id, x)
        } catch (e) {
            if (config.debug) {
                return e.message
            } else {
                return false;
            }
        }
    })
    return res.json(await Promise.all(result));
})

app.delete("/series", async (req, res) => {
    const ids = req.query.series;
    const result = ids.map(async x => {
        try {
            return await file.deleteSeries(id) && Boolean(await db.deleteSeries({ id })) && Boolean(await db.deleteBook({ series_id: id }));
        } catch (e) {
            if (config.debug) {
                return e.message
            } else {
                return false;
            }
        }
    })
    return res.json(await Promise.all(result));
})

app.delete("/book", async (req, res) => {
    const ids = req.query.series;
    const result = ids.map(async id => {
        try {
            const books = (await db.searchBook({ id }))[0].filepath;
            const del = (await file.deleteBook([books]))[0];
            if (del !== true) {
                if (del.message) throw del;
                else return del;
            }
            return Boolean(await db.deleteBook({ id }));
        } catch (e) {
            if (config.debug) {
                return e.message
            } else {
                return false;
            }
        }
    })
    return res.json(await Promise.all(result));
})

export default {
    start() {
        return new Promise((resolve, reject) => {
            try {
                server.listen(config.port, resolve);
            } catch (e) {
                reject(e);
            }
        });
    }
};
