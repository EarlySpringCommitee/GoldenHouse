import { promises as fs, constants as fsc } from "fs";
import { mkdtempSync } from "fs";
import { fileURLToPath } from "url";

import uuid from "uuid/v4.js";

import config from "../config.json";

const rootDir = fileURLToPath(`${import.meta.url}/../../`);
const tmpDir = mkdtempSync("bookEX-");

async function addEpub(path, folderName, no) {
    const relPath = `${config.storage.epub}/${folderName}/${no}.epub`;
    const newPath = `${rootDir}${config.storage.epub}/${folderName}/${no}.epub`;
    try {
        await fs.mkdir(`${rootDir}${config.storage.epub}/${folderName}/`, config.folderMask);
    } catch (e) {
        if (e.code != "EEXIST") throw e;
    }
    await fs.rename(path, newPath);
    return relPath;
}

async function addMobi(path, folderName, no) {
    const relPath = `${config.storage.epub}/${folderName}/${no}.mobi`;
    const newPath = `${rootDir}${config.storage.epub}/${folderName}/${no}.mobi`;
    try {
        await fs.mkdir(`${rootDir}${config.storage.epub}/${folderName}/`, config.folderMask);
    } catch (e) {
        if (e.code != "EEXIST") throw e;
    }
    await fs.rename(path, newPath);
    return relPath;
}

async function deleteBook(paths) {
    return await Promise.all(
        paths.map(async path => {
            try {
                await fs.unlink(rootDir + path);
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
    const paths = basenames.map(x => `${rootDir}${x}`);
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

async function deleteSeries(seriesName) {
    await fs.rmdir(`${rootDir}${config.storage.mobi}/${seriesName}`);
    try {
        await fs.rmdir(`${rootDir}${config.storage.epub}/${seriesName}`);
    } catch (e) {}
    try {
        await fs.rmdir(`${rootDir}${config.storage.image}/epub/${seriesName}`);
    } catch (e) {}
    try {
        await fs.rmdir(`${rootDir}${config.storage.image}/mobi/${seriesName}`);
    } catch (e) {}
    try {
        await fs.rmdir(`${rootDir}${config.storage.image}/series/${seriesName}`);
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
        return `${config.storage.image}/${type}/${folderName}/${filename}`;
    }
}

async function moveTempEpubFile(path) {
    const newPath = path + ".epub";
    await fs.rename(path, newPath);
    return newPath;
}

async function moveTempSeriesImage(oldPath, folderName) {
    const extName = path.extname(oldPath);
    const newDir = `${rootDir}${config.storage.image}/series/${folderName}/`;
    const newPath = `${newDir}/series${extName}`;
    const relPath = `${config.storage.image}/series/${folderName}/cover${extName}`;
    await fs.mkdir(newDir, { recursive: true });
    await fs.rename(oldPath, newPath);
    return relPath;
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
    deleteImage,
    moveTempSeriesImage
};
export { rootDir, config };
