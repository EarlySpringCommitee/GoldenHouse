import { spawn } from "child_process";
import { promises as fs } from "fs";
import { rootDir } from "./file.mjs";
import { fileURLToPath } from "url";
import download from "download";
import process from "process";

const binPath = `${rootDir}/bin/`;
const checkFileExist = fs.access(`${binPath}/kindlegen`, fs.F_OK).catch(() => {
    const binUrl = (function() {
        switch (process.platform) {
            case "darwin":
                return "https://kindlegen.s3.amazonaws.com/KindleGen_Mac_i386_v2_9.zip";
            case "linux":
                return "https://kindlegen.s3.amazonaws.com/kindlegen_linux_2.6_i386_v2_9.tar.gz";
            case "win32":
                return "https://kindlegen.s3.amazonaws.com/kindlegen_win32_v2_9.zip";
            default:
                throw new Error("Unsupported platform");
        }
    })();
    download(binUrl, binPath, {
        extract: true
    }).then(function() {
        return console.log("Download completed");
    });
});

async function convert(inputPath, outputPath) {
    inputPath = fileURLToPath(inputPath);
    outputPath = fileURLToPath(outputPath);
    await checkFileExist;
    const kindlegen = spawn(`${binPath}/kindlegen`, [inputPath, "-c2", "-verbose", "-o", outputPath]);
    return kindlegen.on("close", async function(code) {
        if (code !== 0 && code !== 1) {
            throw new Error("kindlegen returned error " + code);
        }
        try {
            await fs.access(outputPath, fs.F_OK);
            return outputPath;
        } catch (e) {
            throw new Error("File Error.");
        }
    });
}

export default {
    convert
};