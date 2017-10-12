"use strict";

var mime = require('mime');
var restify = require('restify');
var yargs = require('yargs');

yargs.options({
    'port': {
        'default': 8080,
        'description': 'Port to listen on.'
    },
    'public': {
        'type': 'boolean',
        'default': false,
        'description': 'Run a public server that listens on all interfaces.'
    },
    'production': {
        'type': 'boolean',
        'default': false,
        'description': 'Run the built version of the code.'
    }
});

var argv = yargs.argv;
var server = restify.createServer();

//The built in gzipResponse gzips everything, including compressed files.
//This disables gzipping for specific routes and files.
var gzipResponse = restify.gzipResponse();
server.use(function (req, res, next) {
    var url = req.url;

    //Tiles are pre-gzipped.
    if (/\/3DTiles\/(.*)/.test(url)) {
        res.header('Content-Encoding', 'gzip');
        next();
        return;
    }

    //Don't gzip things that are likely gzipped already.
    var contentType = mime.lookup(url);
    if (/^(image|audio|video)\//.test(contentType)) {
        next();
        return;
    }

    gzipResponse(req, res, next);
});

server.get(/.*/, restify.serveStatic({
    directory: argv.production ? 'build' : 'public',
    default: 'index.html',
    maxAge: 0
}));

server.listen(argv.port, argv.public ? undefined : 'localhost', function () {
    console.log('%s listening at %s', server.name, server.url);
});

var shuttingDown = false;
function shutdown() {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;

    console.log("Closing server connections...");
    server.close(function () {
        console.log("Shutdown successfull.");
        process.exit(0);
    });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
