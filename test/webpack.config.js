var glob = require("glob");

module.exports = {
	entry: glob.sync("./test/*.spec.js"),
	output: {
		path: "./test/dist",
		filename: "tests.bundle.js"
	},
	watch: true
}