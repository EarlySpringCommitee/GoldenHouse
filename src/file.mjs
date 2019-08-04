import { promises as fs, constants as fsc } from "fs";
import { mkdtempSync } from "fs";
import { fileURLToPath } from "url";

import uuid from "uuid/v4.js";

import config from "../config.json";

const rootDir = fileURLToPath(`${import.meta.url}/../../`);
const tmpDir = mkdtempSync("bookEX-");

async function addEpub(path, seriesName, no) {
    const newPath = `${rootDir}${config.storage.epub}/${seriesName}/${no}.epub`;
    try {
        await fs.mkdir(`${`${rootDir}${config.storage.epub}/${seriesName}/`}`, config.folderMask);
    } catch (e) {
        if (e.code != "EEXIST") throw e;
    }
    await fs.rename(path, newPath);
    return newPath;
}

async function addMobi(path, seriesName, no) {
    const newPath = `${rootDir}${config.storage.epub}/${seriesName}/${no}.mobi`;
    try {
        await fs.mkdir(`${`${rootDir}${config.storage.epub}/${seriesName}/`}`, config.folderMask);
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

async function deleteSeries(name) {
    await fs.rmdir(`${rootDir}${config.storage.epub}/${name}`);
    try {
        fs.rmdir(`${rootDir}${config.storage.image}/epub/${name}`);
        fs.rmdir(`${rootDir}${config.storage.image}/mobi/${name}`);
    } catch (e) {}
    return true;
}

async function addImage(buffer, extname, seriesName, type) {
    const id = uuid();
    const filename = `${id}${extname}`;
    await fs.mkdir(`${rootDir}${config.storage.image}/${type}/${seriesName}/`, { recursive: true });
    const path = `${rootDir}${config.storage.image}/${type}/${seriesName}/${filename}`;
    try {
        await fs.access(path, fsc.F_OK);
        return await addImage(buffer, extname);
    } catch (e) {
        // File Does not exist.
        await fs.writeFile(buffer, extname, seriesName, type);
        return `${type}/${seriesName}/${filename}`;
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
