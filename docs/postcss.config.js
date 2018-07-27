module.exports = {
	plugins: [
		require('postcss-import'),
		require('postcss-normalize')({ forceImport: true }),
		require('postcss-simple-vars'),
		require('postcss-nested'),
		require('autoprefixer'),
		require('cssnano')
	]
}