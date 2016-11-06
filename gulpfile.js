const
	gulp  = require("gulp"),

	build = require("./tasks/build"),
	docs  = require("./tasks/docs"),
	test  = require("./tasks/test")

gulp.task("dist", gulp.series(
	gulp.parallel(build.bundle, build.minified),
	docs.updateBuilds
))


gulp.task("build", gulp.parallel(build.bundle, build.minified))
gulp.task("minify", build.minified)
gulp.task("test", test.qunit)
