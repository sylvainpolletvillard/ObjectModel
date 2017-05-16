const glob = require("glob");
const path = require("path");

module.exports = {
	devtool: "cheap-module-eval-source-map",
	entry: glob.sync("./test/*.spec.js"),
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "tests.bundle.js"
	}
}