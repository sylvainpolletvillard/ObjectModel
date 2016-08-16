const gulp = require('gulp');
const babel = require('gulp-babel');
const rename = require('gulp-rename');
const header = require('gulp-header');
const sourcemaps = require('gulp-sourcemaps');

const pkg = require("../package.json");

module.exports = {

	es6: function(){
		return gulp.src('dist/object-model.js')
			.pipe(sourcemaps.init())
			.pipe(babel({
				sourceMaps: true,
				presets: [require('babel-preset-minify')],
				compact: true,
				minified: true,
				comments: false
			}))
			.pipe(rename({ suffix: ".min" }))
			.pipe(header(`// ObjectModel v${pkg.version} - ${pkg.homepage}\n`))
			.pipe(sourcemaps.write('.'))
			.pipe(gulp.dest('dist'))
	},

	umd: function () {

	}

}