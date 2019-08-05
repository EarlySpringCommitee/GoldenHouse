import { promises as fs, constants as fsc } from "fs";
import { mkdtempSync } from "fs";
import { fileURLToPath } from "url";

import uuid from "uuid/v4.js";

import config from "../config.json";

const rootDir = fileURLToPath(`${import.meta.url}/../../`);
const tmpDir = mkdtempSync("bookEX-");

async function addEpub(path, folderName, no) {
    const newPath = `${rootDir}${config.storage.epub}/${folderName}/${no}.epub`;
    try {
        await fs.mkdir(`${rootDir}${config.storage.epub}/${folderName}/`, config.folderMask);
    } catch (e) {
        if (e.code != "EEXIST") throw e;
    }
    await fs.rename(path, newPath);
    return newPath;
}

async function addMobi(path, folderName, no) {
    const newPath = `${rootDir}${config.storage.epub}/${folderName}/${no}.mobi`;
    try {
        await fs.mkdir(`${rootDir}${config.storage.epub}/${folderName}/`, config.folderMask);
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

async function deleteImage(basenames) {
    const paths = basenames.map(x => `${rootDir}${config.storage.image}/${x}`);
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

async function deleteSeries(seriesId) {
    await fs.rmdir(`${rootDir}${config.storage.epub}/${seriesId}`);
    try {
        fs.rmdir(`${rootDir}${config.storage.image}/epub/${seriesId}`);
        fs.rmdir(`${rootDir}${config.storage.image}/mobi/${seriesId}`);
    } catch (e) {}
    return true;
}

async function addImage(buffer, extname, folderName, type) {
    const id = uuid();
    const filename = `${id}${extname}`;
    await fs.mkdir(`${rootDir}${config.storage.image}/${type}/${folderName}/`, { recursive: true });
    const path = `${rootDir}${config.storage.image}/${type}/${folderName}/${filename}`;
    try {
        await fs.access(path, fsc.F_OK);
        return await addImage(buffer, extname, folderName, type);
    } catch (e) {
        // File Does not exist.
        await fs.writeFile(path, buffer);
        return `${type}/${folderName}/${filename}`;
    }
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
    moveTempEpubFile,
    deleteImage
};
export { rootDir, config };
