import uglify from "rollup-plugin-uglify"

const isProduction = process.env.BUILD === 'production';

export default {
	input: 'build/bundle-entry' + (isProduction ? '.js' : '.dev.js'),
	output: {
		name: 'window',
		file: 'dist/object-model' + (isProduction ? '.min.js' : '.js'),
		format: 'umd',
		sourcemap: true,
		extend: true
	},
	plugins: isProduction ? [uglify({ ecma: 6 })] : []
};