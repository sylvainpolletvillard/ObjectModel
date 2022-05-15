import fs from 'fs';
import pkg from '../package.json' assert { type: 'json' };

const banner = `// ObjectModel v${pkg.version} - ${pkg.homepage}
// ${pkg.license} License - ${pkg.author}`;

const paths = [
	"./dist/object-model.js",
	"./dist/object-model.min.js"
]

paths.forEach(path => {
	fs.writeFileSync(path, banner + '\n' + fs.readFileSync(path, 'utf8'))
})