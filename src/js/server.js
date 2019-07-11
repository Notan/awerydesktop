const electron = require('electron');
let express = require('express');
let https = require('https');
let app = express();
let fs = require('fs');
let path = require('path');

let certPath = '/../../res/cert';

const userDataPath = (electron.app || electron.remote.app).getPath('userData');
const acmFolderPath = path.join(userDataPath, '/acm');
app.use('/', express.static(acmFolderPath));
app.enable('trust proxy');
app.set('port', process.env.PORT || 13789);

let httpsOptions = {
    key: fs.readFileSync(__dirname + certPath + '/localhost.key'),
    cert: fs.readFileSync(__dirname + certPath + '/localhost.crt')
};
https.createServer(httpsOptions, app).listen(13789, () => {
    console.log('Express HTTPS server listening on port ' + app.get('port'));
    console.log('https://localhost:' + app.get('port'));
});