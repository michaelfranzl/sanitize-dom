/*
 * How to run:
 *
 * * npm install -g http-server
 * * In the root directory of sanitize-dom, run `http-server`
 * * In a browser which supports `<script type="importmap"></script>`, e.g.
 *   Google Chrome Version 81, open http://127.0.0.1:8080/test
*/

import runTests from './run-tests.js';

const fragment = document.createDocumentFragment();
const container = document.createElement('body');
fragment.appendChild(container);

runTests(document, container);
