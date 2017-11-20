/*jshint esversion: 6 */

const gulp = require('gulp');
const showdown = require('showdown');

gulp.task('readme', function() {
  const fs = require('fs');
  const jsdoc2md = require('jsdoc-to-markdown');

  const output = jsdoc2md.renderSync({
    files: 'src/*.js',
    template: fs.readFileSync('README.hbs').toString(),
  });
  fs.writeFileSync('README.md', output);
  
  var converter = new showdown.Converter({
    tables: true,
  });
  
  // for debugging only
  fs.writeFileSync('README.html', converter.makeHtml(output));
});