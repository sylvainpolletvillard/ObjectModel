import fs from 'fs';
import filesize from 'pretty-bytes';
import { gzipSizeSync } from 'gzip-size';

import pkg from '../package.json' assert { type: 'json' };

function updateIndex(html){
	const libPath = "./dist/object-model.min.js"
	//const gzipSize = gzipSizeFromFileSync(libPath);
	const gzipSize = gzipSizeSync(fs.readFileSync(libPath, 'utf8'));
	console.info(`gzip size: ${gzipSize}`)

	console.info(`${pkg.name} v${pkg.version}: ${filesize(gzipSize)} minified and gzipped`)

	return html
		.replace(/(<strong class="size-gzip">)([^<]+)(<\/strong>)/g, `$1${ filesize(gzipSize) }$3`)
		.replace(/(<span class="version">)([^<]+)(<\/span>)/g, `$1${ pkg.version }$3`)
		.replace(/(<a class="link-zip")([^<]+)(<\/a>)/g,
			`$1 href="https://github.com/sylvainpolletvillard/ObjectModel/archive/v${pkg.version}.zip">`
			+`object-model-${pkg.version}.zip$3`)
}

const path = "./index.html"
fs.writeFileSync(path, updateIndex(fs.readFileSync(path, 'utf8')))