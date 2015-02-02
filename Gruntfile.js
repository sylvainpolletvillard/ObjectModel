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
				banner: ";(function(global){\n",
				footer: "\n\n"
				+"global.ObjectModel = ObjectModel;\n"
				+"global.ArrayModel = ArrayModel;\n"
				+"global.FunctionModel = FunctionModel;\n"
				+"})(this);"
			},
			dist: {
				src: ['src/helpers.js', 'src/definitions.js', 'src/object-model.js', 'src/array-model.js', 'src/function-model.js'],
				dest: 'dist/object-model.js'
			},
			coremodule: {
				src: ['src/helpers.js', 'src/definitions.js', 'src/object-model.js'],
				dest: 'dist/object-model.core.js'
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
					src:['dist/*.js','src/**','lib/**','test/**','Gruntfile.js','package.json']
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
		},
		umd: {
			ObjectModel: {
				options: {
					src: 'dist/object-model.core.js',
					dest: 'dist/modules/object-model.js', // optional, if missing the src will be used
					objectToExport: 'ObjectModel', // optional, internal object that will be exported
					amdModuleId: 'ObjectModel' // optional, if missing the AMD module will be anonymous
				}
			},
			ArrayModel: {
				options: {
					src: 'src/array-model.js',
					dest: 'dist/modules/array-model.js', // optional, if missing the src will be used
					objectToExport: 'ArrayModel', // optional, internal object that will be exported
					amdModuleId: 'ArrayModel', // optional, if missing the AMD module will be anonymous
					deps: { // optional
						'default': ['ObjectModel']
					}
				}
			},
			FunctionModel: {
				options: {
					src: 'src/function-model.js',
					dest: 'dist/modules/function-model.js', // optional, if missing the src will be used
					objectToExport: 'FunctionModel', // optional, internal object that will be exported
					amdModuleId: 'FunctionModel', // optional, if missing the AMD module will be anonymous
					deps: { // optional
						'default': ['ObjectModel']
					}
				}
			},
			Constraint: {
				options: {
					src: 'src/constraint.js',
					dest: 'dist/modules/constraint.js', // optional, if missing the src will be used
					objectToExport: 'Constraint', // optional, internal object that will be exported
					amdModuleId: 'Constraint', // optional, if missing the AMD module will be anonymous
					deps: { // optional
						'default': ['ObjectModel']
					}
				}
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
	grunt.loadNpmTasks('grunt-umd');

	grunt.registerTask('dist-modules', ['concat:coremodule','umd:ObjectModel','umd:ArrayModel','umd:FunctionModel'/*,'umd:Constraint'*/]);
	grunt.registerTask('dist-build', ['concat:dist','uglify:dist','file_info:dist','compress:source_files']);
	grunt.registerTask('dist', ['dist-build','dist-modules','regex-replace:site']);
	grunt.registerTask('test', ['qunit:dist']);
	grunt.registerTask('default', ['dist','test']);

};