module.exports = {
	plugins: [
		require("postcss-import"),
		require("postcss-simple-vars"),
		require("postcss-nested"),
		require("css-prefers-color-scheme/postcss"),
		require("autoprefixer"),
		require("postcss-normalize")({ forceImport: true }),
		require("cssnano")
	]
}
