/*
eslint no-param-reassign: ["error", { "props": true, "ignorePropertyModificationsFor": ["node"] }]
*/

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

import childrenOf from './lib/children-of.js';
import joinSiblings from './lib/join-siblings.js';
import getValuesForTagname from './lib/get-values-for-tagname.js';
import matchesAny from './lib/matches-any.js';
import { filterAttributesForNode, filterClassesForNode } from './lib/attributes.js';

/**
 * Implements the WHATWG DOM Document interface.
 *
 * In the browser, this is `window.document`. In Node.js, this may for example be
 * [new JSDOM().window.document](https://github.com/tmpvar/jsdom).
 *
 * @see {@link https://dom.spec.whatwg.org/#interface-document}
 * @typedef {Object} DomDocument
 */

/**
 * Implements the WHATWG DOM Node interface.
 *
 * In addition, two custom property names are recognized (see properties below).
 * These custom properties may be set by {@link filter}s or by the user
 * before {@link sanitizeDom} is run. {@link sanitizeDom} removes those
 * attributes from the DomNode after each run.
 *
 * @see {@link https://dom.spec.whatwg.org/#interface-node}
 * @typedef {Object} DomNode
 * @property {boolean} sanitize_skip_filters If truthy, disables all filters for this node.
 * @property {boolean} sanitize_skip If truthy, disables all processing of this node.
 */

/**
 * All-uppercase node tag name.
 *
 * Even though in the WHATWG DOM text nodes (nodeType 3) have a tag name '#text',
 * these are referred to by the simpler string 'TEXT' for convenience.
 *
 * @typedef {string} Tagname
 * @example
 * 'DIV'
 * 'H1'
 * 'TEXT'
 */

/**
 * A string which is compiled to a regular expression with `new RegExp('^' + Regex + '$')`. The
 * regular expression is used to match a {@link Tagname}.
 *
 * @typedef {string} Regex
 * @example
 * '.*'         // matches any tag
 * 'DIV'        // matches DIV
 * 'DIV|H[1-3]' // matches DIV, H1, H2 and H3
 * 'TEXT'       // matches text nodes (nodeType 3)
 */

/**
 * Property names are matched against a parent node's {@link Tagname}. Associated values are matched
 * against a children node's {@link Tagname}. If parent and child must be direct or deep descendants
 * depends on the usage of this type.
 *
 * @typedef {Object.<Regex, Regex[]>} ParentChildSpec
 * @example
 * {
 *   'DIV|SPAN': ['H[1-3]', 'B'], // matches H1, H2, H3 and B within DIV or SPAN
 *   'STRONG': ['.*'] // matches all tags within STRONG
 * }
 */

/**
 * Property names are matched against a node's {@link Tagname}. Associated values are used to match
 * attribute names.
 *
 * @typedef {Object.<Regex, Regex[]>} TagAttributeNameSpec
 * @example
 * {
 *   'H[1-3]': ['id', 'class'], // matches 'id' and 'class' attributes of all H1, H2 and H3 nodes
 *   'STRONG': ['data-.*'] // matches all 'data-.*' attributes of STRONG nodes.
 * }
 */

/**
 * Property names are matched against a node's {@link Tagname}. Associated values are used to match
 * class names.
 *
 * @typedef {Object.<Regex, Regex[]>} TagClassNameSpec
 * @example
 * {
 *   'DIV|SPAN': ['blue', 'red'] // matches 'blue' and 'red' class names of all DIV and SPAN nodes
 * }
 */


/**
 * Property names are matched against node {@link Tagname}s. Associated values
 * are the {@link filter}s which are run on the node.
 *
 * @typedef {Object.<Regex, filter[]>} FilterSpec
 */


/**
 * Filter functions can either...
 *
 * 1. optionally modify `node` and return it again,
 * 2. return a single, or an Array of, newly created {@link DomNode}(s), in which case `node` is
 * replaced with the new node(s),
 * 3. return `null`, in which case `node` is removed.
 *
 * Note that newly generated {@link DomNode}(s) are processed by running {@link sanitizeDom}
 * on them, as if they had been part of the original tree. This has the following implication:
 *
 * If a filter returns a newly generated {@link DomNode} with the same {@link Tagname} as `node`, it
 * would cause the same filter to be called again, which may lead to an infinite loop if the filter
 * is always returning the same result. In this case, in order to prevent the infinite loop, an
 * exception is thrown immediately. The author of the filter must set custom attributes
 * (see {@link DomNode}) on the node, which may or may not allow subsequent filtering/processing.
 * With well-behaved filters it is possible to continue subsequent processing.
 *
 * @callback filter
 * @param {DomNode} node Currently processed node
 * @param {DomNode[]} parents The parent nodes of `node`.
 * @param {Tagname[]} parentNodenames The tag names of the parent nodes, provided for convenience.
 * @returns {(DomNode|DomNode[]|null)}
 */


/**
 * Recursively processes a tree with `node` at the root.
 *
 * In all descriptions, the term "flatten" means that a node is replaced with the node's childNodes.
 * For example, if the B node in `<i>abc<b>def<u>ghi</u></b></i>` is flattened, the result is
 * `<i>abcdef<u>ghi</u></i>`.
 *
 * Each node is processed in the following sequence:
 *
 * 1. Filters matching the `opts.filters_by_tag` spec are called. If the filter returns `null`, the
 *    node is removed and processing stops (see {@link filter}s).
 * 2. If the `opts.remove_tags_*` spec matches, the node is removed and processing stops.
 * 3. If the `opts.flatten_tags_*` spec matches, the node is flattened and processing stops.
 * 4. If the `opts.allow_tags_*` spec matches:
 *     * All attributes not matching `opts.allow_attributes_by_tag` are removed.
 *     * All class names not matching `opts.allow_classes_by_tag` are removed.
 *     * The node is kept and processing stops.
 * 5. The node is flattened.
 *
 * @param {DomDocument} doc The document
 * @param {DomNode} rootNode - The root node
 * @param {Bool} [childrenObly=false] - If false, then the node itself and its descendants are
 * processed recursively. If true, then only the children and its descendants are processed
 * recursively, but not the node itself (use when `node` is `BODY` or `DocumentFragment`).
 * @param {Object} [opts={}] - Options for processing.
 * @param {FilterSpec} [opts.filters_by_tag={}] - Matching filters are called with the node.
 * @param {ParentChildSpec} [opts.remove_tags_direct={}] - Matching nodes which are a direct child
 * of the matching parent node are removed.
 * @param {ParentChildSpec} [opts.remove_tags_deep={'.*': ['style','script','textarea','noscript']}]
 * Matching nodes which are anywhere below the matching parent node are removed.
 * @param {ParentChildSpec} [opts.flatten_tags_direct={}] - Matching nodes which are a direct child
 * of the matching parent node are flattened.
 * @param {ParentChildSpec} [opts.flatten_tags_deep={}] - Matching nodes which are anywhere below
 * the matching parent node are flattened.
 * @param {ParentChildSpec} [opts.allow_tags_direct={}] - Matching nodes which are a direct child of
 * the matching parent node are kept.
 * @param {ParentChildSpec} [opts.allow_tags_deep={}] - Matching nodes which are anywhere below the
 * matching parent node are kept.
 * @param {TagAttributeNameSpec} [opts.allow_attributes_by_tag={}] - Matching attribute names of a
 * matching node are kept. Other attributes are removed.
 * @param {TagClassNameSpec} [opts.allow_classes_by_tag={}] - Matching class names of a matching
 * node are kept. Other class names are removed. If no class names are remaining, the class
 * attribute is removed.
 * @param {boolean} [opts.remove_empty=false] Remove nodes which are completely empty or contain
 * only white space.
 * @param {Tagname[]} [opts.join_siblings=[]] Join same-tag sibling nodes of given tag names, unless
 * they are separated by non-whitespace textNodes.
 *
*/
function sanitizeDom(
  doc,
  rootNode,
  childrenOnly = false,
  options = {},
) {
  const optionDefaults = {
    filters_by_tag: {},
    remove_tags_direct: {},
    remove_tags_deep: { '.*': ['style', 'script', 'textarea', 'noscript'] },
    flatten_tags_direct: {},
    flatten_tags_deep: {},
    allow_tags_direct: {},
    allow_tags_deep: {},
    allow_attributes_by_tag: {},
    allow_classes_by_tag: {},
    join_siblings: [],
    allowed_empty_tags: ['IMG', 'IFRAME', 'HR', 'BR', 'INPUT'],
  };

  const opts = { ...optionDefaults, ...options };

  const parents = [];
  const parentNodenames = [];

  function replaceWithNodes(replaceable, replacements) {
    for (let i = 0; i < replacements.length; i += 1) {
      const n = replacements[i];
      replaceable.parentNode.insertBefore(n, replaceable);
    }
    replaceable.remove();
  }

  function runFiltersOnNode(node, filters) {
    let skipFilters;

    skipFilters = node.sanitize_skip_filters; // TODO: underline property?
    delete node.sanitize_skip_filters;
    if (skipFilters) return false;

    let replacements = [];
    let removed = false;
    for (let i = 0; i < filters.length; i += 1) {
      const filter = filters[i];

      const result = filter(node, parents, parentNodenames);
      if (result === node) {
        skipFilters = node.sanitize_skip_filters; // TODO: underline property?
        delete node.sanitize_skip_filters;
        if (skipFilters) {
          break;
        } else {
          continue;
        }
      } else if (result instanceof Array) {
        replaceWithNodes(node, result);
        removed = true;
        replacements = replacements.concat(result);
      } else if (result) {
        node.parentNode.replaceChild(result, node);
        removed = true;
        replacements.push(result);
      } else {
        node.remove();
        removed = true;
      }

      for (let j = 0; j < replacements.length; j += 1) {
        const r = replacements[j];
        if (r.nodeName === node.nodeName) {
          if (typeof r.sanitize_skip_filters === 'undefined') {
            const filterFunctionName = filter.prototype.constructor.name || 'anonymous';
            throw new Error(
              `Prevented possible infinite loop. Filter function
              '${filterFunctionName}' has returned a node of type
              '${r.nodeName}' which has the same nodeName as the original node. This can lead to an
              infinite loop if the filter always returns the same result. To get rid of this
              warning, the filter must set the property 'sanitize_skip_filters' on the returned node
              (evaluating to true or false) to signal if the returned node is to be sanitized again
              (false) or not (true).`,
            );
          }
        }
        sanitizeNode(r);
      }
      break;
    }
    return removed;
  }

  function moveChildNodesToFragment(node) {
    const fragment = doc.createDocumentFragment();
    const children = childrenOf(node);
    for (let i = 0; i < children.length; i += 1) fragment.appendChild(children[i]);
    return fragment;
  }

  // This 'flattens' a node.
  function childNodesToSanitizedSiblings(node) {
    const fragment = moveChildNodesToFragment(node);
    sanitizeChildNodes(fragment);
    node.parentNode.insertBefore(fragment, node);
    node.remove();
  }

  function sanitizeNode(node) {
    if (node.sanitize_skip) {
      delete node.sanitize_skip;
      return;
    }

    let tagname = node.nodeName;

    if (node.nodeType === 3) tagname = 'TEXT'; // instead of #text for easier attribute accessors

    const filters = getValuesForTagname(opts.filters_by_tag, tagname);
    if (runFiltersOnNode(node, filters)) return; // The node has been removed by a filter.

    if (node.nodeType === 3) return; // Nothing more to do for a plain-text node.

    if (
      matchesAny(opts.remove_tags_direct, parents[0].nodeName, tagname)
      || parentNodenames.some((name) => matchesAny(opts.remove_tags_deep, name, tagname))
    ) {
      node.remove();
      return;
    }

    if (
      matchesAny(opts.flatten_tags_direct, parents[0].nodeName, tagname)
      || parentNodenames.some((name) => matchesAny(opts.flatten_tags_deep, name, tagname))
    ) {
      childNodesToSanitizedSiblings(node);
      return;
    }

    if (
      matchesAny(opts.allow_tags_direct, parents[0].nodeName, tagname)
      || parentNodenames.some((name) => matchesAny(opts.allow_tags_deep, name, tagname))
    ) {
      if (!node.sanitize_skip_filter_classes) {
        filterClassesForNode(node, opts.allow_classes_by_tag);
      }

      if (!node.sanitize_skip_filter_attributes) {
        filterAttributesForNode(node, opts.allow_attributes_by_tag);
      }

      parents.unshift(node);
      parentNodenames.unshift(node.nodeName);
      sanitizeChildNodes(node);
      parents.shift();
      parentNodenames.shift();

      return;
    }

    // If nothing else handled this node, flatten it.
    childNodesToSanitizedSiblings(node);
  }

  function sanitizeChildNodes(parent) {
    const children = childrenOf(parent);
    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];
      sanitizeNode(node);

      if (
        opts.remove_empty
        && node.nodeType === 1 // element
        && !opts.allowed_empty_tags.includes(node.nodeName)
        && node.childNodes.length === 0
      ) {
        node.remove();
      }
    }

    if (opts.join_siblings.length > 0) joinSiblings(parent, opts.join_siblings);
  }

  if (!(doc && typeof doc.createElement === 'function')) { // simple interface check
    throw new Error('Need DOM Document interface (function createElement missing)');
  }

  if (!(rootNode && typeof rootNode.normalize === 'function')) { // simple interface check
    throw new Error('Need DOM Node interface (function normalize missing)');
  }

  parents.unshift(rootNode);
  parentNodenames.unshift(rootNode.nodeName);
  if (childrenOnly === true) {
    sanitizeChildNodes(rootNode);
  } else {
    sanitizeNode(rootNode);
  }

}

export default sanitizeDom;
