import Promise from "bluebird";
import SQL from "sql-template-strings";
import sqlite from "sqlite";

import { fileURLToPath } from "url";

const dbPromise = sqlite.open(fileURLToPath(`${import.meta.url}/../../db.db3`), { Promise });

function isInt(str) {
    var n = Math.floor(Number(str));
    return n !== Infinity && String(n) === str && n >= 0;
}

const fields = {
    series: ["id", "title", "author", "desc", "cover_id"],
    book: ["id", "series_id", "title", "no", "filepath", "upload_time", "desc", "cover_id", "filetype"]
};

async function addSeries(data) {
    /*
        columns: 
            "id"	    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
            "title"	    TEXT NOT NULL UNIQUE,
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
        return await Promise.all(
            data.map(async x => {
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
            })
        );
    } catch (e) {
        throw e;
    }
}

/**
 * Search series.
 *
 * @param {Object} [data] Query Object.
 * @param {[Number|[Number,'>'|'<']|[Number, Number]]} [data.id] ID.
 * @param {String} [data.title] Title.
 * @param {String} [data.author] Author
 * @param {String} [data.desc] Description.
 * @param {String} [data.cover_id] Cover ID.
 *
 * @return {Promise<any[]>} Promisfied Data Array.
 */
async function searchSeries(data) {
    /*
        columns:
            "id"	    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
            "title"	    TEXT NOT NULL UNIQUE,
            "author"	TEXT,
            "desc"	    TEXT,
            "cover_id"	TEXT
    */
    try {
        const db = await dbPromise;
        const query = SQL`SELECT * FROM series`;
        if (data) {
            let queried = false;
            for (const key of fields.series) {
                if (data[key] && data[key].length) {
                    query.append(queried ? " AND " : " WHERE ");
                    if (key == "id") {
                        const arr = data[key];
                        query.append("(");
                        for (const i in arr) {
                            const e = arr[i];
                            if (i > 0) query.append(" OR ");
                            if (isInt(e)) {
                                query.append(`(${key}`).append(SQL` = ${parseInt(e)})`);
                            } else {
                                if (e[1] == ">") query.append(`${key}`).append(SQL` > ${e[0]}`);
                                else if (e[1] == "<") query.append(`(${key}`).append(SQL` < ${e[0]}`);
                                else if (isInt(e[1]))
                                    query.append(`(${key}`).append(SQL` BETWEEN ${e[1]} and ${e[0]})`);
                            }
                        }
                        query.append(")");
                    } else query.append(`${key}`).append(SQL` LIKE ${"%" + data[key] + "%"}`);
                    queried = true;
                }
            }
        }
        return await db.all(query);
    } catch (e) {
        throw e;
    }
}

/**
 * Delete series.
 *
 * @param {Object} [data] Query Object.
 * @param {[Number|[Number,'>'|'<']|[Number, Number]]} [data.id] ID.
 * @param {String} [data.title] Title.
 * @param {String} [data.author] Author
 * @param {String} [data.desc] Description.
 * @param {String} [data.cover_id] Cover ID.
 *
 * @return {Promise<Number>} Promisfied Delete Changes.
 */
async function deleteSeries(data) {
    /*
        columns:
            "id"	    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
            "title"	    TEXT NOT NULL UNIQUE,
            "author"	TEXT,
            "desc"	    TEXT,
            "cover_id"	TEXT
    */
    try {
        const db = await dbPromise;
        const query = SQL`DELETE FROM series`;
        let queried = false;
        if (data) {
            for (const key of fields.series) {
                if (data[key] && data[key].length) {
                    query.append(queried ? " AND " : " WHERE ");
                    if (key == "id") {
                        const arr = data[key];
                        query.append("(");
                        for (const i in arr) {
                            const e = arr[i];
                            if (i > 0) query.append(" OR ");
                            if (isInt(e)) {
                                query.append(`(${key}`).append(SQL` = ${e})`);
                            } else {
                                if (e[1] == ">") query.append(`${key}`).append(SQL` > ${e[0]}`);
                                else if (e[1] == "<") query.append(`${key}`).append(SQL` < ${e[0]}`);
                                else if (isInt(e[1]))
                                    query.append(`(${key}`).append(SQL` BETWEEN ${e[1]} and ${e[0]})`);
                            }
                        }
                        query.append(")");
                    } else query.append(`${key}`).append(SQL` LIKE ${"%" + data[key] + "%"}`);
                    queried = true;
                }
            }
        }
        if (!queried) throw new Error("No queries.");
        const result = await db.run(query);
        return result.changes;
    } catch (e) {
        throw e;
    }
}

/**
 * Search books.
 *
 * @param {Object} [data] Query Object.
 * @param {[Number|[Number,'>'|'<']|[Number, Number]]} [data.id] ID.
 * @param {[Number|[Number,'>'|'<']|[Number, Number]]} [data.series_id] Series ID.
 * @param {String} [data.title] Title.
 * @param {[Number|[Number,'>'|'<']|[Number, Number]]} [data.no] No.
 * @param {String} [data.filepath] Filepath.
 * @param {[Number|[Number,'>'|'<']|[Number, Number]]} [data.upload_time] Upload Time.
 * @param {String} [data.desc] Description.
 * @param {String} [data.cover_id] Cover ID.
 * @param {String} [data.filetype] Filetype.
 *
 * @return {Promise<any[]>} Promisfied Data Array.
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
        const query = SQL`SELECT * FROM book`;
        if (data) {
            let queried = false;
            for (const key of fields.book) {
                if (data[key] && data[key].length) {
                    query.append(queried ? " AND " : " WHERE ");
                    if (["id", "series_id", "no", "upload_time"].includes(key)) {
                        const arr = data[key];
                        query.append("(");
                        for (const i in arr) {
                            const e = arr[i];
                            if (i > 0) query.append(" OR ");
                            if (isInt(e)) {
                                query.append(`(${key}`).append(SQL` = ${e})`);
                            } else {
                                if (e[1] == ">") query.append(`${key}`).append(SQL` > ${e[0]}`);
                                else if (e[1] == "<") query.append(`${key}`).append(SQL`$ < ${e[0]}`);
                                else if (isint(e[1]))
                                    query.append(`(${key}`).append(SQL` BETWEEN ${e[1]} and ${e[0]})`);
                            }
                        }
                        query.append(")");
                    } else query.append(`${key}`).append(SQL` LIKE ${"%" + data[key] + "%"}`);
                    queried = true;
                }
            }
        }
        return await db.all(query);
    } catch (e) {
        throw e;
    }
}

/**
 * Delete books.
 *
 * @param {Object} [data] Query Object.
 * @param {[Number|[Number,'>'|'<']|[Number, Number]]} [data.id] ID.
 * @param {[Number|[Number,'>'|'<']|[Number, Number]]} [data.series_id] Series ID.
 * @param {String} [data.title] Title.
 * @param {[Number|[Number,'>'|'<']|[Number, Number]]} [data.no] No.
 * @param {String} [data.filepath] Filepath.
 * @param {[Number|[Number,'>'|'<']|[Number, Number]]} [data.upload_time] Upload Time.
 * @param {String} [data.desc] Description.
 * @param {String} [data.cover_id] Cover ID.
 * @param {String} [data.filetype] Filetype.
 *
 * @return {Promise<Number>} Promisfied Delete changes.
 */
async function deleteBook(data) {
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
        const query = SQL`DELETE FROM book`;
        let queried = false;
        if (data) {
            for (const key of fields.book) {
                if (data[key] && data[key].length) {
                    query.append(queried ? " AND " : " WHERE ");
                    if (["id", "series_id", "no", "upload_time"].includes(key)) {
                        const arr = data[key];
                        query.append("(");
                        for (const i in arr) {
                            const e = arr[i];
                            if (i > 0) query.append(" OR ");
                            if (typeof e != "object") {
                                query.append(`(${key}`).append(SQL` = ${e})`);
                            } else {
                                if (e[1] == ">") query.append(`${key}`).append(SQL` > ${e[0]}`);
                                else if (e[1] == "<") query.append(`${key}`).append(SQL` < ${e[0]}`);
                                else if (isInt(e[1]))
                                    query.append(`(${key}`).append(SQL` BETWEEN ${e[1]} and ${e[0]})`);
                            }
                        }
                        query.append(")");
                    } else query.append(`${key}`).append(SQL` LIKE ${"%" + data[key] + "%"}`);
                    queried = true;
                }
            }
        }
        if (!queried) throw new Error("No queries.");
        return await db.all(query);
    } catch (e) {
        throw e;
    }
}
/**
 * Edit a book.
 *
 * @param { Number } id Book ID.
 * @param { Object } [data] Query Object.
 * @param { Number } [data.series_id] Series ID.
 * @param { String } [data.title] Title.
 * @param { Number } [data.no] No.
 * @param { String } [data.filepath] Filepath.
 * @param { Number } [data.upload_time] Upload Time.
 * @param { String } [data.desc] Description.
 * @param { String } [data.cover_id] Cover ID.
 * @param { String } [data.filetype] Filetype.
 *
 * @return { Promise<Boolean> }
 */
async function editBook(id, data) {
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
        const query = SQL`UPDATE book SET `;
        let queried = false;
        for (const key of ["series_id", "title", "no", "filepath", "upload_time", "desc", "cover_id", "filetype"]) {
            if (data[key]) {
                const e = data[key];
                if (["series_id", "no", "upload_time"].includes(key)) {
                    if (isInt(e)) continue;
                } else if (typeof e != "string") {
                    continue;
                } else {
                    queried
                        ? query.append(`, ${key}`).append(SQL` = ${e}`)
                        : query.append(`${key}`).append(SQL` = ${e}`);
                    queried = true;
                }
            }
        }
        if (!queried) throw new Error("No queries.");
        query.append(SQL` WHERE id = ${id}`);
        return Boolean((await db.run(query)).changes);
    } catch (e) {
        throw e;
    }
}

/**
 * Edit a series.
 *
 * @param { Number } id Series ID.
 * @param { Object } [data] Query Object.
 * @param { String } [data.title] Title.
 * @param { String } [data.author] Author.
 * @param { String } [data.desc] Description.
 * @param { String } [data.cover_id] Cover ID.
 *
 * @return { Promise<Boolean> }
 */
async function editSeries(id, data) {
    /*
    columns:
        "id"	    INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
        "title"	    TEXT NOT NULL UNIQUE,
        "author"	TEXT,
        "desc"	    TEXT,
        "cover_id"	TEXT
    */
    try {
        const db = await dbPromise;
        const query = SQL`UPDATE series SET `;
        let queried = false;
        for (const key of ["title", "author", "desc", "cover_id"]) {
            if (data[key]) {
                const e = data[key];
                if (typeof e != "string") {
                    continue;
                } else {
                    queried
                        ? query.append(`, ${key}`).append(SQL` = ${e}`)
                        : query.append(`${key}`).append(SQL` = ${e}`);
                    queried = true;
                }
            }
        }
        if (!queried) throw new Error("No queries.");
        query.append(SQL` WHERE id = ${id}`);
        return Boolean((await db.run(query)).changes);
    } catch (e) {
        throw e;
    }
}

async function addStatus() {
    const db = await dbPromise;
    const result = await db.run(SQL`INSERT INTO convert_status DEFAULT VALUES`);
    return result.lastID;
}

async function editStatus(id, status) {
    const db = await dbPromise;
    const query = SQL`UPDATE convert_status SET status = ${status} WHERE id = ${id}`;
    return Boolean((await db.run(query)).changes);
}

async function getStatus(id) {
    const db = await dbPromise;
    const query = SQL`SELECT * FROM convert_status WHERE id = ${id}`;
    return await db.get(query);
}

export default {
    addSeries,
    deleteSeries,
    editSeries,
    searchSeries,
    addBook,
    deleteBook,
    editBook,
    searchBook,
    fields,
    addStatus,
    editStatus,
    getStatus
};
