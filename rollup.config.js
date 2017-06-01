import uglify from "rollup-plugin-uglify-es"

const isProduction = process.env.BUILD === 'production';

export default {
	entry: 'build/bundle-entry' + (isProduction ? '.js' : '.dev.js'),
	dest: 'dist/object-model' + (isProduction ? '.min.js' : '.js'),
	format: 'umd',
	moduleName: 'window',
	sourceMap: true,
	plugins: isProduction ? [uglify({
		compress: {
			evaluate: false //prevent an unsafe compression
		}
	})] : []
};