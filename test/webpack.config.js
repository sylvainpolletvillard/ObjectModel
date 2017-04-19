const glob = require("glob");
const path = require("path");

module.exports = {
	entry: glob.sync("./test/*.spec.js"),
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "tests.bundle.js"
	}
}