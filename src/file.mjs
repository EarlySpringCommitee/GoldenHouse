import { promises as fs } from "fs";
import { mkdtempSync } from "fs";
import { fileURLToPath } from "url";

import uuid from "uuid/v4.js";

import config from "../config.json";

const rootDir = fileURLToPath(`${import.meta.url}/../../`);
const tmpDir = mkdtempSync("bookEX-");

async function addEpub(path, seriesName, no) {
    const newPath = fileURLToPath(`${path}/${seriesName}/${no}.epub`);
    try {
        await fs.mkdir(`${fileURLToPath(`${path}/${seriesName}`)}`, config.folderMask);
    } catch (e) {
        if (e.code != "EEXIST") throw e;
    }
    await fs.rename(path, newPath);
    return newPath;
}

async function addMobi(path, seriesName, no) {
    const newPath = fileURLToPath(`${path}/${seriesName}/${no}.mobi`);
    try {
        await fs.mkdir(`${fileURLToPath(`${path}/${seriesName}`)}`, config.folderMask);
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
    try {
        const id = uuid();
        const filename = `${id}${extname}`;
        await fs.access(filename, fs.F_OK);
    } catch (e) {
        return await addImage(buffer, extname);
    }
    try {
        await fs.mkdir(`${config.storage.public}/image/`, config.folderMask);
    } catch (e) {
        if (e.code != "EEXIST") throw e;
    }

    await fs.writeFile(`${config.storage.public}/image/${filename}`, buffer);
    return id;
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
