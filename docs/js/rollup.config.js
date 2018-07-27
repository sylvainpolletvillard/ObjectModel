import babel from 'rollup-plugin-babel';
import { terser } from "rollup-plugin-terser";

export default {
	input: 'docs/js/main.js',
	output: {
		file: 'docs/js/main.compiled.js',
		format: 'iife',
		sourcemap: true
	},
	plugins: [babel({
		presets: [["env", { "modules": false }]] ,
		plugins: ["transform-object-rest-spread"]
	}), terser()]
};