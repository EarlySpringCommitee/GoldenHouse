import { spawn } from "child_process";
import { promises as fs } from "fs";
import { rootDir, config } from "./file.mjs";
import path from "path";
import download from "download";
import process from "process";

const binPath = `${rootDir}/bin/`;
const checkFileExist = () =>
    fs.access(`${binPath}/kindlegen`, fs.F_OK).catch(() => {
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

fs.mkdir(binPath, config.folderMask)
    .then(checkFileExist)
    .catch(checkFileExist);

function convert(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const kindlegen = spawn(
            `${binPath}/kindlegen`,
            [inputPath, "-c2", "-verbose", "-o", path.basename(outputPath)],
            {
                cwd: path.dirname(outputPath),
                uid: process.getuid() || 1000,
                gid: process.getgid() || 1000
            }
        );
        if (config.debug)
            kindlegen.stdout.on("data", function(data) {
                console.log("kindlegen: " + data);
            });
        kindlegen.on("close", async function(code) {
            if (code !== 0 && code !== 1) {
                reject(new Error("kindlegen returned error " + code));
            }
            try {
                fs.access(outputPath, fs.F_OK).then(() => {
                    resolve(outputPath);
                });
            } catch (e) {
                reject(new Error("File Error."));
            }
        });
    });
}

export { convert };
