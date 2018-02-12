/*jshint esversion: 6 */

const gulp = require('gulp');
const showdown = require('showdown');
const fs = require('fs');
const rollup = require('rollup');
const rollup_plugin_babel = require('rollup-plugin-babel');


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
  //fs.writeFileSync('README.html', converter.makeHtml(output));
});




gulp.task('build', function() {
  rollup.rollup({
    input: 'src/index.js',
    plugins: [
      rollup_plugin_babel({
        exclude: 'node_modules/**',
        "presets": [
          ["env", {
            "targets": {
              "browsers": ["> 90%"]
            },
            "modules": false
          }],
          ["minify", {
            "mangle": false // Buggy! If true: 'ReferenceError: children is not defined'
          }]
        ],
        "plugins": ["external-helpers"],
      })
    ],
  })
  .then(function(bundle) {
    return bundle.write({
      format: 'umd',
      name: 'sanitizeDom',
      sourcemap: true,
      file: 'dist/sanitize-dom.umd.min.js'
    });
  });
});