module.exports = {
	plugins: [
		require("postcss-import"),
		require("postcss-simple-vars"),
		require("postcss-nested"),
		require("postcss-scrollbar"),
		require("css-prefers-color-scheme"),
		require("autoprefixer"),
		require("postcss-normalize")({ forceImport: true }),
		require("cssnano")
	]
}
