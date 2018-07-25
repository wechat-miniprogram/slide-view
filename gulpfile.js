const gulp = require('gulp');
const clean = require('gulp-clean');

const config = require('./tools/config');
const BuildTask = require('./tools/build');

let entry = config.entry;
let idMap = {};

if (typeof entry === 'object') {
    idMap = entry;
} else {
    idMap = { main: entry };
}

// build task instance
let idList = Object.keys(idMap);
idList.forEach(id => {
    new BuildTask({
        id,
        entry: idMap[id]
    });
});

// clean the generated folders and files
gulp.task('clean', gulp.series(() => {
    return gulp.src(config.distPath, { read: false, allowEmpty: true })
        .pipe(clean())
}, done => {
    if (config.isDev) {
        return gulp.src(config.demoDist, { read: false, allowEmpty: true })
            .pipe(clean());
    }

    done();
}));
// watch files and build
gulp.task('watch', gulp.parallel.apply(gulp, idList.map(id => `${id}-watch`)));
// build for develop
gulp.task('dev', gulp.parallel.apply(gulp, idList.map(id => `${id}-dev`)));
// build for publish
gulp.task('default', gulp.parallel.apply(gulp, idList.map(id => `${id}-default`)));
