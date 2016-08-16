const
	gulp  = require("gulp"),
	qunit = require("gulp-qunit")

module.exports = {

	qunit: function () {
		return gulp.src("test/index.html")
			.pipe(qunit({
				'binPath': require('phantomjs2').path,
				'phantomjs-options': ['--debug=true']
			}));
	}

}