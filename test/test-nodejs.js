import jsdom from 'jsdom';
import runTests from './run-tests.js';

const { JSDOM } = jsdom;
const dom = new JSDOM();

runTests(dom.window.document, dom.window.document.body);
