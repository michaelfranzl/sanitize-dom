/*jshint esversion: 6 */

/*
sanitize-dom - Recursive sanitizer/filter for WHATWG DOMs.

Copyright 2017 Michael Karl Franzl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


const sanitizeDom = require('./sanitize-dom.js');

/**
 * Simple wrapper for {@link sanitizeDom} but sets `mode='node'`, thus processes
 * the node itself and its childNodes recursively.
 * 
 * @param {DomDocument} doc
 * @param {DomNode} node
 * @param {Object} [opts={}]
 */
function sanitizeNode(doc, node, opts = {}) {
  sanitizeDom(doc, node, 'node', opts);
}

/**
 * Simple wrapper for {@link sanitizeDom} but sets `mode='children'`, thus processes
 * only the node's childNodes recursively, but not the node itself.
 * 
 * @param {DomDocument} doc
 * @param {DomNode} node
 * @param {Object} [opts={}]
 */
function sanitizeChildNodes(doc, node, opts = {}) {
  sanitizeDom(doc, node, 'children', opts);
}


/**
 * Simple wrapper for {@link sanitizeDom}. Instead of a DomNode, it takes an
 * HTML string, converts it to a sandboxed document (no scripts are executed, no
 * remote content fetched) and runs sanitizeDom on it.
 * 
 * @param {DomDocument} doc
 * @param {string} html
 * @param {Object} [opts={}]
 * @returns {DomNode[]} The root nodes of the HTML string after parsing and processing
 */
function sanitizeHtml(doc, html, opts = {}) {
  if (!(doc && typeof doc.createElement == 'function')) { // simple interface check
    throw new Error("Need DOM Document interface");
  }
  
  // put HTML into a sandbox (no remote content will be fetched)
  let sandboxdom = doc.implementation.createHTMLDocument('');
  sandboxdom.documentElement.innerHTML = html;

  sanitizeDom(doc, sandboxdom.body, 'children', opts);
  
  // Return a safely iterable list with references to the nodes.
  let childrefs = [];
  for (let node of sandboxdom.body.childNodes) {
    childrefs.push(node);
  }
  return childrefs;
}

module.exports = {
  sanitizeDom,
  sanitizeNode,
  sanitizeChildNodes,
  sanitizeHtml,
};