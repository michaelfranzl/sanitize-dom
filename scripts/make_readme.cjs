const fs = require('fs');
const { Converter } = require('showdown');
const jsdoc2md = require('jsdoc-to-markdown');

const output = jsdoc2md.renderSync({
  files: 'src/*.js',
  template: fs.readFileSync('README.hbs').toString(),
});
fs.writeFileSync('README.md', output);

// For debugging only
/*
const converter = new Converter({
  tables: true,
});

fs.writeFileSync('README.html', converter.makeHtml(output));
*/
