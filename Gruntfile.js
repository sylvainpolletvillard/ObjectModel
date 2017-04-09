const gzipSize = require('gzip-size').sync;

module.exports = function(grunt) {

	function esc(text) {
		return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
	}

	const pkg  = grunt.file.readJSON('package.json');
	const BANNER = `// ObjectModel v${pkg.version} - ${pkg.homepage}`;

	// Project configuration.
	grunt.initConfig({
		pkg: pkg,
		usebanner: {
			dist: {
				options: {
					banner: BANNER
				},
				files: {
					src: [ 'dist/*.js' ]
				}
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

	grunt.loadNpmTasks('grunt-file-info');
	grunt.loadNpmTasks('grunt-regex-replace');
	grunt.loadNpmTasks('grunt-banner');

	grunt.registerTask('dist', ['usebanner:dist','file_info:dist','regex-replace:site']);
	grunt.registerTask('default', ['dist']);

};