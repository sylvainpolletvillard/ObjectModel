var gzipSize = require('gzip-size').sync;

module.exports = function(grunt) {

	function esc(text) {
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	}

	var pkg = grunt.file.readJSON('package.json');
	var BANNER = "// ObjectModel v"+pkg.version+" - "+pkg.homepage + "\n";

	var srcFiles = [
		'src/constants.js',
		'src/helpers.js',
		'src/model.js',
		'src/object-model.js',
		'src/array-model.js',
		'src/function-model.js'
	]

	// Project configuration.
	grunt.initConfig({
		pkg: pkg,
		concat: {
			dist: {
				src: srcFiles,
				dest: 'dist/object-model.js',
				options: {
					banner: BANNER + ";(function(global){\n",
					footer: "\n\nglobal.Model = Model;\n})(this);"
				}
			},
			dist_umd: {
				src: srcFiles,
				dest: 'dist/object-model.umd.js',
				options: {
					banner: BANNER + ";(function (globals, factory) {\n"
					+" if (typeof define === 'function' && define.amd) define(factory); // AMD\n"
					+" else if (typeof exports === 'object') module.exports = factory(); // Node\n"
					+" else globals['Model'] = factory(); // globals\n"
					+"}(this, function () {\n",
					footer: "\nreturn Model;\n}));"
				}
			}
		},
		uglify: {
			dist: {
				options: {
					banner: BANNER,
					screwIE8: true
				},
				files: {
					'dist/object-model.min.js': ['dist/object-model.js']
				}
			}
		},
		watch: {
			scripts: {
				files: ['src/**.js','lib/**.js','test/**.js'],
				tasks: ['dist'],
				options: {
					spawn: false
				}
			}
		},
		qunit: {
			dist: {
				src: ['test/index.html']
			}
		},
		file_info: {
			dist: {
				src: ['dist/object-model.js','dist/object-model.min.js'],
				options: {
					stdout: false,
					inject: [
						{
							dest: 'index.html',
							text: 'all in <strong>{{= sizeText(size(src[1])) }} minified, {{= sizeText(gzipSize(src[1])) }} gzipped</strong>'
						},
						{
							dest: 'index.html',
							text: 'Minified file ({{= sizeText(size(src[1])) }}, {{= sizeText(gzipSize(src[1])) }} gzipped)'
						}
					]
				}
			}
		},
		"regex-replace": {
			site: { //specify a target with any name
				src: ['index.html'],
				actions: [
					{
						name: 'version number',
						search: esc('Current version: v')+'\\d+\\.\\d+\\.\\d+',
						replace: 'Current version: v'+pkg.version
					},{
						name: 'zip url',
						search: esc('<a href="https://github.com/sylvainpolletvillard/ObjectModel/archive/v')
						+'\\d+\\.\\d+\\.\\d+'+esc('.zip">object-model-')+'\\d+\\.\\d+\\.\\d+'+esc('.zip</a>'),
						replace: '<a href="https://github.com/sylvainpolletvillard/ObjectModel/archive/v'
						+pkg.version+'.zip">object-model-'+pkg.version+'.zip</a>'
					}
				]
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-file-info');
	grunt.loadNpmTasks('grunt-regex-replace');

	grunt.registerTask('dist', ['concat:dist','concat:dist_umd','uglify:dist','file_info:dist','regex-replace:site']);
	grunt.registerTask('test', ['qunit:dist']);
	grunt.registerTask('default', ['dist','test']);

};