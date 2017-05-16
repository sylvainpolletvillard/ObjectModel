const fs = require('fs');
const filesize = require('filesize')
const getGzipSize = require('gzip-size').sync;

const pkg  = require('../../package.json');

function updateIndex(html){
	const libPath = "./dist/object-model.min.js"
	const minSize = fs.statSync(libPath).size;
	const gzipSize = getGzipSize(fs.readFileSync(libPath, 'utf8'));

	console.info(`${pkg.name} v${pkg.version}: ${filesize(minSize)} minified, ${filesize(gzipSize)} gzipped`)

	return html
		.replace(/(<strong class="size-min">)([^<]+)(<\/strong>)/g, `$1${ filesize(minSize) }$3`)
		.replace(/(<strong class="size-gzip">)([^<]+)(<\/strong>)/g, `$1${ filesize(gzipSize) }$3`)
		.replace(/(<span class="version">)([^<]+)(<\/span>)/g, `$1${ pkg.version }$3`)
		.replace(/(<a class="link-zip")([^<]+)(<\/a>)/g,
			`$1 href="https://github.com/sylvainpolletvillard/ObjectModel/archive/v${pkg.version}.zip">`
			+`object-model-${pkg.version}.zip$3`)
}

const path = "./index.html"
fs.writeFileSync(path, updateIndex(fs.readFileSync(path, 'utf8')))