var express = require('express'),
    routes = require('./routes'),
    upload = require('./routes/upload'),
    http = require('http'),
    https = require('https'),
    fs = require('fs'),
    path = require('path'),
    httpApp = express(),
    app = express(),
    certPath = "cert";


var httpsOptions = {
    key: fs.readFileSync(path.join(certPath, "ssl.key")),
    cert: fs.readFileSync(path.join(certPath, "ssl.crt"))
};
httpApp.set('port', process.env.PORT || 80);
httpApp.get("*", function (req, res, next) {
    res.redirect("https://" + req.headers.host + "/" + req.path);
});

// all environments
app.set('port', process.env.PORT || 443);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.enable('trust proxy');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/', routes.index);
app.post('/upload', upload.s3);


http.createServer(httpApp).listen(httpApp.get('port'), function () {
    console.log('Express HTTP server listening on port ' + httpApp.get('port'));
});

https.createServer(httpsOptions, app).listen(app.get('port'), function () {
    console.log('Express HTTPS server listening on port ' + app.get('port'));
});