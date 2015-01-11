module.exports = function(grunt) {

	function esc(text) {
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	}

	var pkg = grunt.file.readJSON('package.json');

	// Project configuration.
	grunt.initConfig({
		pkg: pkg,
		concat: {
			options: {
				banner: ";(function(){\n",
				footer: "\n})();"
			},
			dist: {
				src: ['js/helpers.js', 'js/definitions.js', 'js/object-model.js', 'js/array-model.js', 'js/function-model.js'],
				dest: 'dist/object-model.js'
			}
		},
		uglify: {
			dist: {
				files: {
					'dist/object-model.min.js': ['dist/object-model.js']
				}
			}
		},
		watch: {
			scripts: {
				files: ['js/**.js','lib/**.js','test/**.js'],
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
					inject: [
						{
							dest: 'index.html',
							text: 'all in {{= sizeText(size(src[1])) }} minified ({{= sizeText(gzipSize(src[1])) }} gzipped)'
						},
						{
							dest: 'index.html',
							text: 'minified file ({{= sizeText(size(src[1])) }})'
						}
					]
				}
			}
		},
		compress: {
			source_files: {
				options: {
					archive: 'dist/object-model-<%= pkg.version %>.zip'
				},
				files: [{
					src:['dist/*.js','js/**','lib/**','test/**','Gruntfile.js','package.json']
				}]
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
						search: esc('<a href="dist/object-model-')+'\\d+\\.\\d+\\.\\d+'+esc('.zip">object-model-')+'\\d+\\.\\d+\\.\\d+'+esc('.zip</a>'),
						replace: '<a href="dist/object-model-'+pkg.version+'.zip">object-model-'+pkg.version+'.zip</a>'
					}
				]
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-qunit');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-file-info');
	grunt.loadNpmTasks('grunt-regex-replace');

	// Default task(s).
	grunt.registerTask('dist', ['concat:dist','uglify:dist','file_info:dist','compress:source_files','regex-replace:site']);
	grunt.registerTask('test', ['qunit:dist']);
	grunt.registerTask('default', ['dist']);

};