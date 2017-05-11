var gulp = require('gulp'),
    gulpbabel = require('gulp-babel'),
    babel = require('babel/register');
    concat = require('gulp-concat'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    mocha = require('gulp-mocha'),
    wrap = require('gulp-wrap'),
    beautify = require('gulp-jsbeautify'),
    jshint = require('gulp-jshint'),
    jscs = require('gulp-jscs'),
    markdox = require('gulp-markdox');

var SRC = 'src/jsonapi-datastore.js',
    DEST = 'dist/';

gulp.task('build', function() {
  return gulp.src(SRC)
    .pipe(gulpbabel())
    .pipe(concat('jsonapi-datastore.js'))
    .pipe(gulp.dest(DEST))
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest(DEST));
});

gulp.task('test', ['build'], function() {
  gulp.src('test/*.spec.js')
    .pipe(gulpbabel())
    .pipe(mocha({compilers: { js: babel }}));
});

gulp.task('jscs', function() {
  return gulp.src(SRC)
    .pipe(gulpbabel())
    .pipe(jscs());
});

gulp.task('jshint', function() {
  return gulp.src(SRC)
    .pipe(gulpbabel())
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('doc', function() {
  return gulp.src(SRC)
    .pipe(gulpbabel())
    .pipe(markdox())
    .pipe(concat("DOCUMENTATION.md"))
    .pipe(gulp.dest('.'));
});

gulp.task('default', ['test', 'build', 'doc']);
