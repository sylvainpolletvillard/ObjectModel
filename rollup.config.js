import uglify from "rollup-plugin-uglify-es"

const isProduction = process.env.BUILD === 'production';

export default {
	input: 'build/bundle-entry' + (isProduction ? '.js' : '.dev.js'),
	output: {
		file: 'dist/object-model' + (isProduction ? '.min.js' : '.js'),
		format: 'umd'
	},
	name: 'window',
	sourcemap: true,
	plugins: isProduction ? [uglify({
		compress: {
			evaluate: false //prevent an unsafe compression
		}
	})] : []
};