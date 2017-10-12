'use strict';

var fsExtra = require('fs-extra');
var gulp = require('gulp');
var gulpJshint = require('gulp-jshint');
var gulpUglify = require('gulp-uglify');
var path = require('path');
var Promise = require('bluebird');
var requirejs = require('requirejs');
var yargs = require('yargs');

var argv = yargs.argv;

var jsHintFiles = ['**/*.js', '!build/**', '!node_modules/**', '!public/ThirdParty/**', '!public/ThirdParty/Cesium/**'];

gulp.task('jsHint', function () {
    var stream = gulp.src(jsHintFiles)
        .pipe(gulpJshint())
        .pipe(gulpJshint.reporter('jshint-stylish'));

    if (argv.failTaskOnError) {
        stream = stream.pipe(gulpJshint.reporter('fail'));
    }

    return stream;
});

gulp.task('jsHint-watch', function () {
    gulp.watch(jsHintFiles).on('change', function (event) {
        gulp.src(event.path)
            .pipe(gulpJshint.extract('auto'))
            .pipe(gulpJshint())
            .pipe(gulpJshint.reporter('jshint-stylish'));
    });
});

//Copies relevant parts of client JS libraries to `public/ThirdParty` for local development
gulp.task('postInstall', function () {
    fsExtra.removeSync('public/ThirdParty');

    var webSiteLibs = [
        {
            name: 'chroma-js',
            glob: [
                'node_modules/chroma-js/chroma.js'
            ]
        }, {
            name: 'knockout',
            glob: [
                'node_modules/knockout/build/output/knockout-latest.js'
            ]
        }, {
            name: 'pepjs',
            glob: [
                'node_modules/pepjs/dist/pep.js'
            ]
        }, {
            name: 'requirejs',
            glob: [
                'node_modules/requirejs/require.js'
            ]
        }, {
            name: 'requirejs-text',
            glob: [
                'node_modules/requirejs-text/text.js'
            ]
        }, {
            name: 'Cesium',
            glob: [
                'node_modules/cesium/Source/**',
                '!node_modules/cesium/Source/Workers/**'
            ],
            subDir: true
        }, {
            name: 'Three',
            glob: [
                'node_modules/three/build/three.min.js',
            ],
            subDir: true
        },
        {
            name: 'Cesium/Workers',
            glob: [
                'node_modules/cesium/Build/Cesium/Workers/**'
            ],
            subDir: true
        }
    ];

    var promises = [];
    var thirdPartyDirectory = 'public/ThirdParty';
    webSiteLibs.forEach(function (module) {
        var dest = thirdPartyDirectory;
        if (module.subDir) {
            dest += '/' + module.name;
        }

        var options = {
            nodir: true,
            base: module.base
        };
        promises.push(streamToPromise(gulp.src(module.glob, options).pipe(gulp.dest(dest))));
    });

    return Promise.all(promises);
});

//Outputs a combined website file into the build directory without minification or removing debug code.
gulp.task('website-combine', function () {
    return buildSite({
        removePragmas: false,
        optimizer: 'none',
        outputDirectory: path.join('build')
    });
});

//Outputs the combined and minified website, with debug code removed, to the build directory.
gulp.task('website-release', function () {
    return buildSite({
        removePragmas: true,
        optimizer: 'uglify2',
        outputDirectory: path.join('build')
    });
});

function buildSite(options) {
    fsExtra.removeSync('build');

    var optimizer = options.optimizer;
    var outputDirectory = options.outputDirectory;
    var removePragmas = options.removePragmas;

    var promise = combineSite(!removePragmas, optimizer, outputDirectory);

    return promise.then(function () {
        //copy to build folder with copyright header added at the top
        var everythingElse = [
            'public/**',
            '!**/*.html',
            '!**/*.js',
            '!**/*.glsl',
            '!**/*.txt',
            '!**/LICENSE',
            '!**/*.map',
            '!**/*.less',
            '!**/*.scss',
            '!**/*.swf',
            '!**/*.md',
            '!public/ThirdParty/bootstrap/fonts/**'
        ];

        var cssPromise = Promise.resolve();
        if (optimizer === 'uglify2') {
            cssPromise = Promise.join(
                minifyCSS('public/index.css', path.join(outputDirectory, 'index.css')),
                minifyCSS('public/ThirdParty/Cesium/Widgets/InfoBox/InfoBoxDescription.css', path.join(outputDirectory, 'ThirdParty/Cesium/Widgets/InfoBox/InfoBoxDescription.css'))
            );
            everythingElse.push('!**/**.css');
        }

        return Promise.join(
            streamToPromise(gulp.src(everythingElse, {nodir: true})
                .pipe(gulp.dest(outputDirectory))),

            streamToPromise(gulp.src('public/ThirdParty/require.js')
                .pipe(gulpUglify())
                .pipe(gulp.dest(outputDirectory + '/ThirdParty/'))),

            //index.html is the only html file that needs to be copied.
            streamToPromise(gulp.src('public/index.html')
                .pipe(gulp.dest(outputDirectory))),

            //We still need the built Cesium workers in the final output.
            streamToPromise(gulp.src('public/ThirdParty/Cesium/Workers/**/*.js', {nodir: true})
                .pipe(gulp.dest(path.join(outputDirectory, 'ThirdParty/Cesium/Workers')))),

            cssPromise);

    });
}

function combineSite(debug, optimizer, combineOutput) {
    return new Promise(function (resolve, reject) {
        requirejs.optimize({
            wrap: true,
            useStrict: true,
            optimize: optimizer,
            optimizeCss: 'standard',
            pragmas: {
                debug: debug
            },
            mainConfigFile: 'public/main.js',
            name: 'main',
            out: path.join(combineOutput, 'main.js')
        }, resolve, reject);
    });
}

function minifyCSS(inFile, outFile) {
    return new Promise(function (resolve, reject) {
        requirejs.optimize({
            wrap: true,
            useStrict: true,
            optimizeCss: 'standard',
            pragmas: {
                debug: true
            },
            cssIn: inFile,
            out: outFile
        }, resolve, reject);
    });
}

function streamToPromise(stream) {
    return new Promise(function (resolve, reject) {
        stream.on('finish', resolve);
        stream.on('end', reject);
    });
}
