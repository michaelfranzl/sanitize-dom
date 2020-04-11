/*
sanitize-dom - Recursive sanitizer/filter for WHATWG DOMs.

Copyright 2020 Michael Karl Franzl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial
portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import sanitizeDom from './sanitize-dom.js';
import childrenOf from './lib/children-of.js';

/**
 * Simple wrapper for {@link sanitizeDom} but sets `childrenOnly` to `false`, thus processes
 * the node itself and its childNodes recursively.
 *
 * @param {DomDocument} doc
 * @param {DomNode} node
 * @param {Object} [opts={}]
 */
function sanitizeNode(doc, node, nodePropertyMap, opts = {}) {
  sanitizeDom(doc, node, nodePropertyMap, false, opts);
}

/**
 * Simple wrapper for {@link sanitizeDom} but sets `childrenOnly` to `true`, thus processes
 * only the node's childNodes recursively, but not the node itself.
 *
 * @param {DomDocument} doc
 * @param {DomNode} node
 * @param {Object} [opts={}]
 */
function sanitizeChildNodes(doc, node, nodePropertyMap, opts = {}) {
  sanitizeDom(doc, node, nodePropertyMap, true, opts);
}

/**
 * Simple wrapper for {@link sanitizeDom}. Instead of a DomNode, it takes an HTML string.
 *
 * @param {DomDocument} doc
 * @param {string} html
 * @param {Object} [opts={}]
 * @returns {DomNode[]} The root nodes of the HTML string after parsing and processing
 */
function sanitizeHtml(doc, html, nodePropertyMap, opts = {}) {
  if (!(doc && typeof doc.createElement === 'function')) { // simple interface check
    throw new Error('Need DOM Document interface');
  }

  // Put the HTML into a sandbox (no remote content will be fetched).
  const sandbox = doc.implementation.createHTMLDocument('');
  sandbox.documentElement.innerHTML = html;

  sanitizeDom(doc, sandbox.body, nodePropertyMap, true, opts);

  return childrenOf(sandbox.body);
}

export {
  sanitizeNode,
  sanitizeChildNodes,
  sanitizeHtml,
};
