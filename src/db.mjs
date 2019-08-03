import Promise from "bluebird";
import SQL from "sql-template-strings";
import sqlite from "sqlite";

import { fileURLToPath } from "url";

const dbPromise = sqlite.open(fileURLToPath(`${import.meta.url}/../../db.test.db3`), { Promise });

async function addSeries(data) {
    /*
        columns: 
            "id"	    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
            "title"	    TEXT NOT NULL,
            "author"	TEXT,
            "desc"	    TEXT,
            "cover_id"	TEXT
    */
    try {
        const db = await dbPromise;
        const result = await db.run(
            SQL`INSERT INTO series VALUES (
                ${null},
                ${data.title}, 
                ${data.author}, 
                ${data.desc}, 
                ${data.cover_id}
            )`
        );
        return result.lastID;
    } catch (e) {
        throw e;
    }
}

async function addBook(data) {
    /*
        columns:
            "id"	        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
            "series_id"	    INTEGER NOT NULL,
            "title"	        TEXT NOT NULL,
            "no"	        INTEGER NOT NULL,
            "filepath"	    TEXT NOT NULL UNIQUE,
            "upload_time"	INTEGER NOT NULL DEFAULT 0,
            "desc"	        TEXT,
            "cover_id"	    TEXT,
            "filetype"	    TEXT
    */
    try {
        const db = await dbPromise;
        return data.map(async x => {
            try {
                const result = await db.run(
                    SQL`INSERT INTO book VALUES (
                            ${null},
                            ${x.series_id},
                            ${x.title},
                            ${x.no},
                            ${x.filepath},
                            ${x.upload_time},
                            ${x.desc},
                            ${x.cover_id},
                            ${x.filetype}
                        )`
                );
                return result.lastID;
            } catch (e) {
                return e;
            }
        });
    } catch (e) {
        throw e;
    }
}

/**
 * Search series.
 *
 * @param {Object} data Query Object.
 * @param {Number|[Number,'>'|'<']|[Number, Number]} data.id ID.
 * @param {String} data.title Title.
 * @param {String} data.author Author
 * @param {String} data.desc Description.
 * @param {String} data.cover_id Cover ID.
 *
 * @return {Promise<false | any[]>} Promisfied Data or false(only when the query is invalid).
 */
async function searchSeries(data) {
    /*
        columns:
            "id"	    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
            "title"	    TEXT NOT NULL,
            "author"	TEXT,
            "desc"	    TEXT,
            "cover_id"	TEXT
    */
    try {
        const db = await dbPromise;
        const query = SQL`SELECT * FROM series WHERE`;
        let queried = false;
        for (const key of ["id", "title", "author", "desc", "cover_id"]) {
            if (data[key] && data[key].length) {
                if (queried) query.append(" AND ");
                if (key == "id") {
                    const e = data[key];
                    if (typeof data[key] == "number") {
                        query.append(SQL`${key} = ${e}`);
                    } else {
                        if (e[1] in [">", "<"]) {
                            query.append(`${key} ${e[1]} ${e[0]}`);
                        } else if (typeof e[1] == "number") {
                            query.append(SQL`${key} BETWEEN ${e[1]} and ${e[0]}`);
                        }
                    }
                } else query.append(SQL`${key} LIKE '%${data[key]}%'`);
                queried = true;
            }
        }
        if (!queried) return false;
        return await db.all(query);
    } catch (e) {
        throw e;
    }
}

/**
 * Search books.
 *
 * @param {Object} data Query Object.
 * @param {Number|[Number,'>'|'<']|[Number, Number]} data.id ID.
 * @param {Number|[Number,'>'|'<']|[Number, Number]} data.series_id Series ID.
 * @param {String} data.title Title.
 * @param {Number|[Number,'>'|'<']|[Number, Number]} data.no No.
 * @param {String} data.filepath Filepath.
 * @param {Number|[Number,'>'|'<']|[Number, Number]} data.upload_time Upload Time.
 * @param {String} data.desc Description.
 * @param {String} data.cover_id Cover ID.
 * @param {String} data.filetype Filetype.
 *
 * @return {Promise<false | any[]>} Promisfied Data or false(only when the query is invalid).
 */
async function searchBook(data) {
    /*
        columns:
            "id"	        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
            "series_id"	    INTEGER NOT NULL,
            "title"	        TEXT NOT NULL,
            "no"	        INTEGER NOT NULL,
            "filepath"	    TEXT NOT NULL UNIQUE,
            "upload_time"	INTEGER NOT NULL DEFAULT 0,
            "desc"	        TEXT,
            "cover_id"	    TEXT,
            "filetype"	    TEXT
    */
    try {
        const db = await dbPromise;
        const query = SQL`SELECT * FROM book WHERE`;
        let queried = false;
        for (const key of [
            "id",
            "series_id",
            "title",
            "no",
            "filepath",
            "upload_time",
            "desc",
            "cover_id",
            "filetype"
        ]) {
            if (data[key] && data[key].length) {
                if (queried) query.append(" AND ");
                if (key in ["id", "series_id", "no", "upload_time"]) {
                    const e = data[key];
                    if (typeof data[key] == "number") {
                        query.append(SQL`${key} = ${e}`);
                    } else {
                        if (e[1] in [">", "<"]) {
                            query.append(`${key} ${e[1]} ${e[0]}`);
                        } else if (typeof e[1] == "number") {
                            query.append(SQL`${key} BETWEEN ${e[1]} and ${e[0]}`);
                        }
                    }
                } else query.append(SQL`${key} LIKE '%${data[key]}%'`);
                queried = true;
            }
        }
        if (!queried) return false;
        return await db.all(query);
    } catch (e) {
        throw e;
    }
}
