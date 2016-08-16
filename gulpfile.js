const
	gulp  = require("gulp"),

	build = require("./tasks/build"),
	docs  = require("./tasks/docs"),
	test  = require("./tasks/test")

gulp.task("dist", gulp.series(
	gulp.parallel(build.es6, build.umd),
	docs.updateBuilds
))

gulp.task("test", test.qunit)

gulp.task("es6", build.es6)