const electron = require('electron');
const path = require('path');
const fs = require('fs');
const fx = require('fs-extra');
const http = require('http');
const AdmZip = require('adm-zip');

const userDataPath = (electron.app || electron.remote.app).getPath('userData');
const tempFolderPatch = path.join(userDataPath, '/temp/');

let acmUpdPatchURL = "http://cdn.awery.com/uibeta/desktop_patch.zip";
let acmUpdPatchArchiveName = "desktop_patch.zip";
let acmFolderPatch;
let completeTempUpdFilePatch;
let zipRootDir;

let mCallOnProgress, mCallOnSuccess, mCallOnError;

/**
 * Update algorithm:
 *   1. If old temp UPD file exist -> remove
 *   2. Download new UPD file
 *   3. UnZIP UPD file (override old ACM files)
 *   4. Remove UPD file
 *   5. finish
 */
exports.update = function update(onProgress, onSuccess, onError, options = {}) {
    acmFolderPatch = path.join(userDataPath, '/acm/');
    if (options.acmUpdPatchURL) {
        acmUpdPatchURL = options.acmUpdPatchURL;
    }
    if (options.acmUpdPatchArchiveName) {
        acmUpdPatchArchiveName = options.acmUpdPatchArchiveName;
    }
    if (options.acmFolderJoinPatch) {
        acmFolderPatch = path.join(acmFolderPatch, options.acmFolderJoinPatch);
    }
    if (options.zipRootDir) {
        zipRootDir = options.zipRootDir;
    }
    completeTempUpdFilePatch = tempFolderPatch + acmUpdPatchArchiveName;

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
        if (fs.existsSync(completeTempUpdFilePatch)) {
            fs.unlinkSync(completeTempUpdFilePatch);
        }
        return typeof mCallOnError === 'function' ? mCallOnError(err.message) : false;
    });

    file.on("error", err => {
        file.close();

        if (err.code === "EEXIST" || err.code === "EXIST") {
            return reject("File already exists");
        } else {
            if (fs.existsSync(completeTempUpdFilePatch)) {
                fs.unlinkSync(completeTempUpdFilePatch);
            } // Delete the file async. (But we don't check the result)
            return typeof mCallOnError === 'function' ? mCallOnError(err.message) : false;
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

    if (zipRootDir && zipRootDir.length > 0) {
        fx.copy(acmFolderPatch + zipRootDir, acmFolderPatch)
            .then(() => {
                console.log('move success!');

                // const ngIndex = fs.readFileSync(`${__dirname}/../html/ng_index.html`);
                // fs.writeFileSync(`${acmFolderPatch}index.html`, ngIndex, {encoding: 'utf8', flag: 'w'});
                fs.unlinkSync(`${acmFolderPatch}index.html`);
                fs.unlinkSync(`${acmFolderPatch}index.php`);
                fs.unlinkSync(`${acmFolderPatch}.htaccess`);

                fx.remove(`${acmFolderPatch}${zipRootDir.split('/')[0]}/`)
                    .then(() => console.log('remove success!'))
                    .catch(err => console.error(err));
            })
            .catch(err => console.error(err));
    }

    mCallOnProgress(3);
    removeUpdatePatchFile();
    mCallOnProgress(4);
    mCallOnSuccess();
}
