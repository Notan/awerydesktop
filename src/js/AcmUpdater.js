const electron = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const AdmZip = require('adm-zip');

const userDataPath = (electron.app || electron.remote.app).getPath('userData');
const acmUpdPatchURL = "http://cdn.awery.com/uibeta/desktop_patch.zip";
const acmUpdPatchArchiveName = "desktop_patch.zip";
const tempFolderPatch = path.join(userDataPath, '/temp/');
const acmFolderPatch = path.join(userDataPath, '/acm/');
const completeTempUpdFilePatch = tempFolderPatch + acmUpdPatchArchiveName;

let mCallOnProgress, mCallOnSuccess, mCallOnError;

/**
 * Update algorithm:
 *   1. If old temp UPD file exist -> remove
 *   2. Download new UPD file
 *   3. UnZIP UPD file (override old ACM files)
 *   4. Remove UPD file
 *   5. finish
 */
exports.update = function update(onProgress, onSuccess, onError) {
    mCallOnProgress = onProgress;
    mCallOnSuccess = onSuccess;
    mCallOnError = onError;
    startUpdate();
};

function startUpdate() {
    init();
    mCallOnProgress(0);
    removeUpdatePatchFile();
    mCallOnProgress(1);
    downloadPatch();
}

function init() {
    if (!fs.existsSync(tempFolderPatch))
        fs.mkdirSync(tempFolderPatch);

    if (!fs.existsSync(acmFolderPatch))
        fs.mkdirSync(acmFolderPatch);
}

function removeUpdatePatchFile(step) {
    if (fs.existsSync(completeTempUpdFilePatch))
        fs.unlinkSync(completeTempUpdFilePatch);
}

function downloadPatch() {
    let file = fs.createWriteStream(completeTempUpdFilePatch);
    let request = http.get(acmUpdPatchURL, response => {
        if (response.statusCode !== 200)
            return mCallOnError('Response status was ' + response.statusCode);

        response.pipe(file);
    });


    request.on('error', function (err) {
        fs.unlink(completeTempUpdFilePatch);
        return mCallOnError(err.message);
    });

    file.on("error", err => {
        file.close();

        if (err.code === "EEXIST") {
            return reject("File already exists");
        } else {
            fs.unlink(completeTempUpdFilePatch); // Delete the file async. (But we don't check the result)
            return mCallOnError(err.message);
        }
    });

    file.on('finish', function () {
        file.close();  // close() is async, call cb after close completes.
        unzipAndFlushPatch();
        return file;
    });
}

function unzipAndFlushPatch() {
    mCallOnProgress(2);
    // reading archive
    let zip = new AdmZip(completeTempUpdFilePatch);
    // extracts everything
    zip.extractAllTo(acmFolderPatch, true);

    mCallOnProgress(3);
    removeUpdatePatchFile();
    mCallOnProgress(4);
    mCallOnSuccess();
}