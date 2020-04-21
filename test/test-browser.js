import runTests from './run-tests.js';

const fragment = document.createDocumentFragment();
const container = document.createElement('body');
fragment.appendChild(container);

runTests(document, container);
