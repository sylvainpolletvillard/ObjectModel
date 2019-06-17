import { terser } from "rollup-plugin-terser";

const isProduction = process.env.BUILD === 'production';

export default {
	input: 'build/bundle-entry' + (isProduction ? '.js' : '.dev.js'),
	output: {
		file: 'dist/object-model' + (isProduction ? '.min.js' : '.js'),
		format: 'esm',
		sourcemap: true,
		extend: true
	},
	plugins: isProduction ? [terser()] : []
};