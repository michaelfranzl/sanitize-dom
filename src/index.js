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
import childrenSnapshot from './lib/children-snapshot.js';

/**
 * Simple wrapper for {@link sanitizeDom}. Processes the node and its childNodes recursively.
 *
 * @param {DomDocument} doc
 * @param {DomNode} node
 * @param {Object} [opts={}]
 * @param {WeakMap.<DomNode, Object>} [nodePropertyMap=new WeakMap()] Additional node properties
 */
function sanitizeNode(doc, node, opts = {}, nodePropertyMap = new WeakMap()) {
  sanitizeDom(doc, node, opts, false, nodePropertyMap);
}

/**
 * Simple wrapper for {@link sanitizeDom}. Processes only the node's childNodes recursively, but not
 * the node itself.
 *
 * @param {DomDocument} doc
 * @param {DomNode} node
 * @param {Object} [opts={}]
 * @param {WeakMap.<DomNode, Object>} [nodePropertyMap=new WeakMap()] Additional node properties
 */
function sanitizeChildNodes(doc, node, opts = {}, nodePropertyMap = new WeakMap()) {
  sanitizeDom(doc, node, opts, true, nodePropertyMap);
}

/**
 * Simple wrapper for {@link sanitizeDom}. Instead of a DomNode, it takes an HTML string.
 *
 * @param {DomDocument} doc
 * @param {string} html
 * @param {Object} [opts={}]
 * @param {Boolean} [isDocument=false] Set this to `true` if you are passing an entire HTML document
 * (beginning with the <html> tag). The context node name will be HTML. If `false`, then the
 * context node name will be BODY.
 * @param {WeakMap.<DomNode, Object>} [nodePropertyMap=new WeakMap()] Additional node properties
 * @returns {String} The processed HTML
 */
function sanitizeHtml(doc, html, opts = {}, isDocument = false, nodePropertyMap = new WeakMap()) {
  const sandbox = doc.implementation.createHTMLDocument('');

  // Put the HTML into a sandbox (no remote content will be fetched).
  if (isDocument) {
    sandbox.documentElement.innerHTML = html;
    sanitizeChildNodes(doc, sandbox.documentElement, opts, nodePropertyMap);
    return sandbox.documentElement.outerHTML;
  }

  // isDocument is false
  sandbox.body.innerHTML = html;
  sanitizeChildNodes(doc, sandbox.body, opts, nodePropertyMap);
  return sandbox.body.innerHTML;
}

export {
  sanitizeNode,
  sanitizeChildNodes,
  sanitizeHtml,
};
