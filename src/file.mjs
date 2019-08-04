import { promises as fs } from "fs";
import { mkdtempSync } from "fs";
import { fileURLToPath } from "url";

import uuid from "uuid/v4.js";

import config from "../config.json";

const rootDir = fileURLToPath(`${import.meta.url}/../../`);
const tmpDir = mkdtempSync("bookEX-");

async function addEpub(path, seriesName, no) {
    const newPath = fileURLToPath(`${config.storage.epub}/${seriesName}/${no}.epub`);
    try {
        await fs.mkdir(`${fileURLToPath(`${config.storage.epub}/${seriesName}/`)}`, config.folderMask);
    } catch (e) {
        if (e.code != "EEXIST") throw e;
    }
    await fs.rename(path, newPath);
    return newPath;
}

async function addMobi(path, seriesName, no) {
    const newPath = fileURLToPath(`${config.storage.mobi}/${seriesName}/${no}.mobi`);
    try {
        await fs.mkdir(`${fileURLToPath(`${config.storage.mobi}/${seriesName}/`)}`, config.folderMask);
    } catch (e) {
        if (e.code != "EEXIST") throw e;
    }
    await fs.rename(path, newPath);
    return newPath;
}

async function deleteBook(paths) {
    return await Promise.all(
        paths.map(async path => {
            try {
                await fs.unlink(path);
                return true;
            } catch (e) {
                if (config.debug) {
                    return e;
                } else {
                    return false;
                }
            }
        })
    );
}

async function deleteSeries(name) {
    await fs.rmdir(`${config.storage.epub}/${name}`);
    return true;
}

async function addImage(buffer, extname) {
    const id = uuid();
    const filename = `${id}${extname}`;
    const path = `${rootDir}${config.storage.public}/image/${filename}`;
    try {
        await fs.access(path, fs.F_OK);
    } catch (e) {
        // File Does not exist.
        await fs.writeFile(path, buffer);
        return filename;
    }
    return await addImage(buffer, extname);
}

async function moveTempEpubFile(path) {
    const newPath = path + ".epub";
    await fs.rename(path, newPath);
    return newPath;
}

export default {
    config,
    rootDir,
    deleteBook,
    deleteSeries,
    addImage,
    tmpDir,
    addEpub,
    addMobi,
    moveTempEpubFile
};
export { rootDir, config };
