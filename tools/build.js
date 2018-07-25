const path = require('path');

const gulp = require('gulp');
const clean = require('gulp-clean');
const less = require('gulp-less');
const rename = require('gulp-rename');
const gulpif = require('gulp-if');
const sourcemaps = require('gulp-sourcemaps');
const webpack = require('webpack');
const gulpWebpack = require('webpack-stream');
const gulpInstall = require('gulp-install');

const config = require('./config');
const checkComponents = require('./checkcomponents');
const _ = require('./utils');

const wxssConfig = config.wxss || {};

class BuildTask {
    constructor(options = {}) {
        this.id = options.id;
        this.entry = options.entry;
        this.srcPath = config.srcPath;
        this.distPath = config.isDev ? path.join(config.distPath, this.id) : path.join(config.distPath, this.id, 'miniprogram_dist');
        this.copyList = Array.isArray(config.copy) ? config.copy : (config.copy && config.copy[this.id] || []);
        this.componentListMap = {};
        this.cachedComponentListMap = {};

        this.init();
    }

    /**
     * get wxss stream
     */
    wxss(wxssFileList) {
        if (!wxssFileList.length) return;

        return gulp.src(wxssFileList, { cwd: this.srcPath, base: this.srcPath })
            .pipe(gulpif(wxssConfig.less && wxssConfig.sourcemap, sourcemaps.init()))
            .pipe(gulpif(wxssConfig.less, less({ paths: [this.srcPath] })))
            .pipe(rename({ extname: '.wxss' }))
            .pipe(gulpif(wxssConfig.less && wxssConfig.sourcemap, sourcemaps.write('./')))
            .pipe(_.logger(wxssConfig.less ? 'generate' : undefined))
            .pipe(gulp.dest(this.distPath));
    }

    /**
     * get js stream
     */
    js(jsFileMap) {
        let webpackConfig = config.webpack;
        let webpackCallback = (err, stats) => {
            if (!err) {
                console.log(stats.toString({
                    assets: true,
                    cached: false,
                    colors: true,
                    children: false,
                    errors: true,
                    warnings: true,
                    version: true,
                    modules: false,
                    publicPath: true,
                }));
            } else {
                console.log(err);
            }
        };

        webpackConfig.entry = jsFileMap;
        webpackConfig.output.path = this.distPath;

        if (this.webpackWatcher) {
            this.webpackWatcher.close();
            this.webpackWatcher = null;
        }

        if (config.isWatch) {
            this.webpackWatcher = webpack(webpackConfig).watch({
                ignored: /node_modules/,
            }, webpackCallback);
        } else {
            webpack(webpackConfig).run(webpackCallback);
        }
    }

    /**
     * copy file
     */
    copy(copyFileList) {
        if (!copyFileList.length) return;

        return gulp.src(copyFileList, { cwd: this.srcPath, base: this.srcPath })
            .pipe(_.logger())
            .pipe(gulp.dest(this.distPath));
    }

    /**
     * install packages
     */
    install() {
        return gulp.series(async () => {
            let demoDist = config.demoDist;
            let demoPackageJsonPath = path.join(demoDist, 'package.json');
            let packageJson = _.readJson(path.resolve(__dirname, '../package.json'));
            let dependencies = packageJson.dependencies || {};

            await _.writeFileSync(demoPackageJsonPath, JSON.stringify({ dependencies }, null, '\t')); // write dev demo's package.json
        }, () => {
            let demoDist = config.demoDist;
            let demoPackageJsonPath = path.join(demoDist, 'package.json');

            return gulp.src(demoPackageJsonPath)
                .pipe(gulpInstall({ production: true }));

        });
    }

    init() {
        /**
         * clean the dist folder
         */
        gulp.task(`${this.id}-clean-dist`, () => {
            return gulp.src(this.distPath, { read: false, allowEmpty: true })
                .pipe(clean());
        });

        /**
         * copy demo to the dev folder
         */
        let isDemoExists = false 
        gulp.task(`${this.id}-demo`, gulp.series(async () => {
            let demoDist = config.demoDist;
            
            isDemoExists = await _.checkFileExists(path.join(demoDist, 'project.config.json'));
        }, done => {
            if (!isDemoExists) {
                let demoSrc = config.demoSrc;
                let demoDist = config.demoDist;

                return gulp.src('**/*', { cwd: demoSrc, base: demoSrc })
                    .pipe(gulp.dest(demoDist));
            }

            return done();
        }));

        /**
         * install packages for dev
         */
        gulp.task(`${this.id}-install`, this.install());

        /**
         * check custom components
         */
        gulp.task(`${this.id}-component-check`, async () => {
            let entry = path.join(this.srcPath, `${this.entry}.json`);
            let newComponentListMap = await checkComponents(entry);

            this.cachedComponentListMap = this.componentListMap;
            this.componentListMap = newComponentListMap;
        });

        /**
         * write json to the dist folder
         */
        gulp.task(`${this.id}-component-json`, done => {
            let jsonFileList = this.componentListMap.jsonFileList;

            if (jsonFileList && jsonFileList.length) {
                return this.copy(this.componentListMap.jsonFileList);
            }

            done();
        });

        /**
         * copy wxml to the dist folder
         */
        gulp.task(`${this.id}-component-wxml`, done => {
            let wxmlFileList = this.componentListMap.wxmlFileList;

            if (wxmlFileList && wxmlFileList.length && !_.compareArray(this.cachedComponentListMap.wxmlFileList, wxmlFileList)) {
                return this.copy(wxmlFileList);
            }

            done();
        });

        /**
         * generate wxss to the dist folder
         */
        gulp.task(`${this.id}-component-wxss`, done => {
            let wxssFileList = this.componentListMap.wxssFileList;

            if (wxssFileList && wxssFileList.length && !_.compareArray(this.cachedComponentListMap.wxssFileList, wxssFileList)) {
                return this.wxss(wxssFileList);
            }

            done();
        });

        /**
         * generate js to the dist folder
         */
        gulp.task(`${this.id}-component-js`, done => {
            let jsFileList = this.componentListMap.jsFileList;

            if (jsFileList && jsFileList.length && !_.compareArray(this.cachedComponentListMap.jsFileList, jsFileList)) {
                this.js(this.componentListMap.jsFileMap);
            }

            done();
        });

        /**
         * copy resources to dist folder
         */
        gulp.task(`${this.id}-copy`, gulp.parallel(done => {
            let copyList = this.copyList;
            let copyFileList = copyList.map(dir => path.join(dir, '**/*.!(wxss)'));

            if (copyFileList.length) return this.copy(copyFileList);

            done();
        }, done => {
            let copyList = this.copyList;
            let copyFileList = copyList.map(dir => path.join(dir, '**/*.wxss'));

            if (copyFileList.length) return this.wxss(copyFileList);

            done();
        }));

        /**
         * watch json
         */
        gulp.task(`${this.id}-watch-json`, () => {
            return gulp.watch(this.componentListMap.jsonFileList, { cwd: this.srcPath, base: this.srcPath }, gulp.series('component-check', gulp.parallel('component-wxml', 'component-wxss', 'component-js', 'component-json')));
        });

        /**
         * watch wxml
         */
        gulp.task(`${this.id}-watch-wxml`, () => {
            this.cachedComponentListMap.wxmlFileList = null;
            return gulp.watch(this.componentListMap.wxmlFileList, { cwd: this.srcPath, base: this.srcPath }, gulp.series('component-wxml'));
        });

        /**
         * watch wxss
         */
        gulp.task(`${this.id}-watch-wxss`, () => {
            this.cachedComponentListMap.wxssFileList = null;
            return gulp.watch('**/*.wxss', { cwd: this.srcPath, base: this.srcPath }, gulp.series('component-wxss'));
        });

        /**
         * watch resources
         */
        gulp.task(`${this.id}-watch-copy`, () => {
            let copyList = this.copyList;
            let copyFileList = copyList.map(dir => path.join(dir, '**/*'));
            let watchCallback = (filePath, stats) => {
                if (path.extname(filePath) === '.wxss') {
                    return this.wxss([filePath]);
                } else {
                    return this.copy([filePath]);
                }
            };

            return gulp.watch(copyFileList, { cwd: this.srcPath, base: this.srcPath })
                .on('change', watchCallback)
                .on('add', watchCallback)
                .on('unlink', watchCallback);
        });

        /**
         * watch installed packages
         */
        gulp.task(`${this.id}-watch-install`, () => {
            return gulp.watch(path.resolve(__dirname, 'package.json'), this.install());
        });

        /**
         * build custom component
         */
        gulp.task(`${this.id}-build`, gulp.series(`${this.id}-clean-dist`, `${this.id}-component-check`, gulp.parallel(`${this.id}-component-wxml`, `${this.id}-component-wxss`, `${this.id}-component-js`, `${this.id}-component-json`, `${this.id}-copy`)));

        gulp.task(`${this.id}-watch`, gulp.series(`${this.id}-build`, `${this.id}-demo`, `${this.id}-install`, gulp.parallel(`${this.id}-watch-wxml`, `${this.id}-watch-wxss`, `${this.id}-watch-json`, `${this.id}-watch-copy`, `${this.id}-watch-install`)));

        gulp.task(`${this.id}-dev`, gulp.series(`${this.id}-build`, `${this.id}-demo`, `${this.id}-install`));

        gulp.task(`${this.id}-default`, gulp.series(`${this.id}-build`));
    }
}

module.exports = BuildTask;
