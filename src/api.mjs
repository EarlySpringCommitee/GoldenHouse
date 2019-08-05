import Promise from "bluebird";

import express from "express";
import session from "express-session";
import sqliteSession from "connect-sqlite3";
import helmet from "helmet";
import http from "http";
import cors from "cors";

import multer from "multer";

import EPub from "epub2/node.js";
import file from "./file.mjs";
import path from "path";

import db from "./db.mjs";

import { convert } from "./convert.mjs";
import { fileURLToPath } from "url";

const config = file.config;

const app = express();
const SQLiteStore = sqliteSession(session);
const server = http.createServer(app);
const upload = multer({ dest: file.tmpDir });

const clone = oldObject => JSON.parse(JSON.stringify(oldObject));

const whitelist = ["http://localhost:3000", "http://172.25.24.2:3000"];
const corsOptions = {
    origin: function(origin, callback) {
        if (whitelist.indexOf(origin) !== -1 || config.debug) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    }
};
app.use(cors(corsOptions));

app.use(express.static("storage"));

app.use(
    express.urlencoded({
        extended: true
    })
);
app.use(express.json());
app.use(helmet());
app.use(
    helmet.hidePoweredBy({
        setTo: "PHP 4.2.0"
    })
);
app.use(
    session({
        store: new SQLiteStore(),
        secret: config.secret,
        cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week
        resave: false,
        saveUninitialized: false
    })
);

/* API */
app.get("/series", async (req, res) => {
    let query = {};
    for (const key of db.fields.series) {
        if (req.query[key]) {
            query[key] = req.query[key];
        }
    }
    const result = await db.searchSeries(query);
    res.json(result);
});

app.get("/book", async (req, res) => {
    let query = {};
    for (const key of db.fields.book) {
        if (req.query[key]) {
            query[key] = req.query[key];
        }
    }
    const result = await db.searchBook(query);
    res.json(result);
});

app.post("/series", upload.array(), async (req, res) => {
    const datas = req.body.series;
    const result = datas.map(async x => {
        try {
            const result = await db.addSeries(x);
            return result;
        } catch (e) {
            if (config.debug) {
                return e.message;
            } else {
                return false;
            }
        }
    });
    res.json(await Promise.all(result));
});

app.post("/book", upload.array("files"), async (req, res) => {
    const files = req.files;
    const datas = req.body.datas;
    const uploadTime = Date.now();
    const rootDir = file.rootDir;

    const statusId = await db.addStatus();
    res.json({
        statusId
    });

    let result = [];

    for (const i in files) {
        const f = files[i];
        const data = clone(datas[i]);
        data.upload_time = uploadTime;
        f.path = await file.moveTempEpubFile(rootDir + f.path);
        const seriesName = (await db.searchSeries({ id: data.series_id }))[0].title;

        try {
            switch (f.mimetype) {
                case "application/epub+zip":
                    // Convert to MOBI
                    db.editStatus(
                        statusId,
                        JSON.stringify({
                            success: false,
                            status: `Converting to MOBI...`,
                            progress: `${i + 1}/${files.length}`
                        })
                    );
                    const mobiTmpPath = await convert(f.path, `${f.path}.mobi`);
                    if (config.debug) console.log(`mobiTmpPath: ${mobiTmpPath}`);
                    db.editStatus(
                        statusId,
                        JSON.stringify({
                            success: false,
                            status: `mobiTmpPath: ${Boolean(mobiTmpPath)}`,
                            debug: config.debug ? mobiTmpPath : undefined,
                            progress: `${i + 1}/${files.length}`
                        })
                    );

                    // Read EPUB meta
                    const epub = await EPub.createAsync(f.path);
                    const meta = epub.metadata;
                    if (config.debug) console.log(`EPUB Meta: `, meta);
                    db.editStatus(
                        statusId,
                        JSON.stringify({
                            success: false,
                            status: `EPUB Meta: ${Boolean(meta)}`,
                            debug: config.debug
                                ? {
                                      title: meta.title,
                                      creator: meta.creator,
                                      description: meta.description,
                                      cover: meta.cover
                                  }
                                : undefined,
                            progress: `${i + 1}/${files.length}`
                        })
                    );
                    for (let [key, value] of Object.entries({
                        title: "title",
                        author: "creator",
                        desc: "description"
                    })) {
                        data[key] = meta[value] && meta[value].length ? meta[value] : data[key];
                    }

                    const mobiData = clone(data);

                    let cover = epub.listImage();
                    if (config.debug) console.log(`EPUB Covers: `, cover);
                    if (cover.length) {
                        cover = cover.find(x => x.id == meta.cover);
                        const extName = path.extname(cover.href);
                        const [buffer, coverMime] = await epub.getImageAsync(meta.cover);
                        const cover_ids = [
                            await file.addImage(buffer, extName, seriesName, "epub"),
                            await file.addImage(buffer, extName, seriesName, "mobi")
                        ];
                        if (config.debug) console.log(`Cover IDs: `, cover_ids);
                        db.editStatus(
                            statusId,
                            JSON.stringify({
                                success: false,
                                status: `Cover IDs: ${Boolean(cover_ids)}`,
                                debug: config.debug ? cover_ids : undefined,
                                progress: `${i + 1}/${files.length}`
                            })
                        );
                        data["cover_id"] = cover_ids[0];
                        mobiData["cover_id"] = cover_ids[1];
                    }

                    data.filepath = await file.addEpub(f.path, seriesName, data.no);
                    data.filetype = "epub";
                    if (config.debug) console.log(`EPUB File data: `, data);
                    db.editStatus(
                        statusId,
                        JSON.stringify({
                            success: false,
                            status: `EPUB File data: ${Boolean(data)}`,
                            debug: config.debug ? data : undefined,
                            progress: `${i + 1}/${files.length}`
                        })
                    );

                    mobiData.filepath = await file.addMobi(mobiTmpPath, seriesName, data.no);
                    mobiData.filetype = "mobi";
                    if (config.debug) console.log(`MOBI File data: `, mobiData);
                    db.editStatus(
                        statusId,
                        JSON.stringify({
                            success: false,
                            status: `MOBI File data: ${Boolean(mobiData)}`,
                            debug: config.debug ? mobiData : undefined,
                            progress: `${i + 1}/${files.length}`
                        })
                    );

                    const resultEpub = await db.addBook([data]);
                    const resultMobi = await db.addBook([mobiData]);

                    if (config.debug) {
                        console.log("EPUB Result: ", resultEpub);
                        console.log("Mobi Result: ", resultMobi);
                    }

                    result[i] = {
                        epub: resultEpub[0] || false,
                        mobi: resultMobi[0] || false
                    };
                    break;
                case "application/vnd.amazon.ebook":
                case "application/x-mobipocket-ebook":
                    // Read mobi metadata
                    data.filepath = await file.addEpub(mobiTmpPath, seriesName, data.no);
                    data.filetype = "mobi";
                    db.editStatus(
                        statusId,
                        JSON.stringify({
                            success: false,
                            status: `MOBI`,
                            progress: `${i + 1}/${files.length}`
                        })
                    );
                    result[i] = {
                        mobi: (await db.addBook([data])[0]) || false
                    };

                    break;
            }
        } catch (e) {
            result[i] = config.debug ? e.message : false;
            db.editStatus(
                statusId,
                JSON.stringify({
                    success: false,
                    status: `Error.`,
                    debug: config.debug ? e.message : undefined,
                    progress: `${i + 1}/${files.length}`
                })
            );
        }
    }
    db.editStatus(
        statusId,
        JSON.stringify({
            success: true,
            data: result
        })
    );
});

app.patch("/series", async (req, res) => {
    const datas = req.body.series;
    const result = datas.map(async x => {
        try {
            return await db.editSeries(x.id, x);
        } catch (e) {
            if (config.debug) {
                return e.message;
            } else {
                return false;
            }
        }
    });
    return res.json(await Promise.all(result));
});

app.patch("/book", async (req, res) => {
    const datas = req.body.book;
    const result = datas.map(async x => {
        try {
            return await db.editBook(x.id, x);
        } catch (e) {
            if (config.debug) {
                return e.message;
            } else {
                return false;
            }
        }
    });
    return res.json(await Promise.all(result));
});

app.delete("/series", async (req, res) => {
    const ids = req.body.series;
    const result = ids.map(async x => {
        try {
            return (
                (await file.deleteSeries(id)) &&
                Boolean(await db.deleteSeries({ id })) &&
                Boolean(await db.deleteBook({ series_id: id }))
            );
        } catch (e) {
            if (config.debug) {
                return e.message;
            } else {
                return false;
            }
        }
    });
    return res.json(await Promise.all(result));
});

app.delete("/book", async (req, res) => {
    const ids = req.body.book;
    const result = ids.map(async id => {
        try {
            const book = (await db.searchBook({ id }))[0].filepath;
            const image = (await db.searchBook({ id }))[0].cover_id;
            const del = (await file.deleteBook([book]))[0];
            if (del !== true) {
                if (del.message) throw del;
                else return del;
            }
            try {
                await file.deleteImage([image]);
            } catch (e) {}
            return Boolean(await db.deleteBook({ id }));
        } catch (e) {
            if (config.debug) {
                return e.message;
            } else {
                return false;
            }
        }
    });
    return res.json(await Promise.all(result));
});

app.get("/convertStatus", async (req, res) => {
    const id = req.query.id;
    return res.json(await db.getStatus(id));
});

export default {
    start() {
        return new Promise((resolve, reject) => {
            try {
                server.listen(config.port, () => resolve(config.port));
            } catch (e) {
                reject(e);
            }
        });
    }
};
