/*jshint esversion: 6 */

/*
sanitize-dom - Recursive sanitizer/filter for WHATWG DOMs.

Copyright 2017 Michael Karl Franzl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


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
 * A string which is compiled to a regular expression with `new RegExp('^' + Regex + '$')`. The regular expression is used to match a {@link Tagname}.
 * 
 * @typedef {string} Regex
 * @example
 * '.*'         // matches any tag
 * 'DIV'        // matches DIV
 * 'DIV|H[1-3]' // matches DIV, H1, H2 and H3
 * 'TEXT'       // matches text nodes (nodeType 3)
 */
 
 /**
 * Property names are matched against a parent node's {@link Tagname}. Associated values are matched against a children node's {@link Tagname}. If parent and child
 * must be direct or deep descendants depends on the usage of this type.
 * 
 * @typedef {Object.<Regex, Regex[]>} ParentChildSpec
 * @example
 * {
 *   'DIV|SPAN': ['H[1-3]', 'B'], // matches H1, H2, H3 and B within DIV or SPAN
 *   'STRONG': ['.*'] // matches all tags within STRONG
 * }
 */
 
 /**
 * Property names are matched against a node's {@link Tagname}. Associated values are used to match attribute names.
 * 
 * @typedef {Object.<Regex, Regex[]>} TagAttributeNameSpec
 * @example
 * {
 *   'H[1-3]': ['id', 'class'], // matches 'id' and 'class' attributes of all H1, H2 and H3 nodes
 *   'STRONG': ['data-.*'] // matches all 'data-.*' attributes of STRONG nodes.
 * }
 */
 
 /**
 * Property names are matched against a node's {@link Tagname}. Associated values are used to match class names.
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
 * 2. return a single, or an Array of, newly created {@link DomNode}(s), in which case `node` is replaced with the new node(s),
 * 3. return `null`, in which case `node` is removed.
 * 
 * Note that newly generated {@link DomNode}(s) are processed by running
 * {@link sanitizeDom} on them, as if they had been part of the original tree.
 * This has the following implication:
 * 
 * If a filter returns a newly generated {@link DomNode} with the same {@link Tagname} as `node`, it would cause the same filter to be called again, which may lead to an infinite loop if the filter is always returning the same result. In this case, in order to prevent the infinite loop, an exception is thrown immediately. The author of the filter must set custom attributes (see {@link DomNode}) on the node, which may or may not allow subsequent filtering/processing. With well-behaved filters it is possible to continue subsequent processing.
 * 
 * 
 * @callback filter
 * @param {DomNode} node Currently processed node
 * @param {DomNode[]} parents The parent nodes of `node`.
 * @param {Tagname[]} parent_nodenames The tag names of the parent nodes, provided for convenience.
 * @returns {(DomNode|DomNode[]|null)}
 */
 



/**
 * Recursively processes a tree with `node` at the root.
 * 
 * In all descriptions, the term "flatten" means that a node is replaced with the node's childNodes. For example, if the B node in `<i>abc<b>def<u>ghi</u></b></i>` is flattened, the result is `<i>abcdef<u>ghi</u></i>`.
 * 
 * Each node is processed in the following sequence:
 * 
 * 1. Filters matching the `opts.filters_by_tag` spec are called. If the filter returns `null`, the node is removed and processing stops (see {@link filter}s).
 * 2. If the `opts.remove_tags_*` spec matches, the node is removed and processing stops.
 * 3. If the `opts.flatten_tags_*` spec matches, the node is flattened and processing stops.
 * 4. If the `opts.allow_tags_*` spec matches:
 *     * All attributes not matching `opts.allow_attributes_by_tag` are removed.
 *     * All class names not matching `opts.allow_classes_by_tag` are removed.
 *     * The node is kept and processing stops.
 * 5. The node is flattened.
 * 
 * @param {DomDocument} doc The document
 * @param {DomNode} node - The root node
 * @param {String} [mode=node] - If 'node' then the node itself and its descendants are processed recursively. If 'children' then the children and its descendants are processed recursively, but not the node itself (useful when `node` is `BODY` or `DocumentFragment`).
 * @param {Object} [opts={}] - Options for processing.
 * @param {FilterSpec} [opts.filters_by_tag={}] - Matching filters are called with the node.
 * @param {ParentChildSpec} [opts.remove_tags_direct={}] - Matching nodes which are a direct child of the matching parent node are removed.
 * @param {ParentChildSpec} [opts.remove_tags_deep={'.*': ['style', 'script', 'textarea', 'noscript']}] - Matching nodes which are anywhere below the matching parent node are removed.
 * @param {ParentChildSpec} [opts.flatten_tags_direct={}] - Matching nodes which are a direct child of the matching parent node are flattened.
 * @param {ParentChildSpec} [opts.flatten_tags_deep={}] - Matching nodes which are anywhere below the matching parent node are flattened.
 * @param {ParentChildSpec} [opts.allow_tags_direct={}] - Matching nodes which are a direct child of the matching parent node are kept.
 * @param {ParentChildSpec} [opts.allow_tags_deep={}] - Matching nodes which are anywhere below the matching parent node are kept.
 * @param {TagAttributeNameSpec} [opts.allow_attributes_by_tag={}] - Matching attribute names of a matching node are kept. Other attributes are removed.
 * @param {TagClassNameSpec} [opts.allow_classes_by_tag={}] - Matching class names of a matching node are kept. Other class names are removed. If no class names are remaining, the class attribute is removed.
 * @param {boolean} [opts.remove_empty=false] Remove nodes which are completely empty or contain only white space.
 * 
*/
function sanitizeDom(
  doc,
  node,
  mode = 'node',
  opts = {
}) {
  if (!(doc && typeof doc.createElement == 'function')) { // simple interface check
    throw new Error("Need DOM Document interface");
  }
  
  if (!(node && typeof node.normalize == 'function')) { // simple interface check
    throw new Error("Need DOM Node interface");
  }
  
  if (!opts.filters_by_tag) opts.filters_by_tag = {};
  
  if (!opts.remove_tags_direct) opts.remove_tags_direct = {};
  if (!opts.remove_tags_deep) opts.remove_tags_deep = {
    '.*': ['style', 'script', 'textarea', 'noscript']
  };
  
  if (!opts.flatten_tags_direct) opts.flatten_tags_direct = {};
  if (!opts.flatten_tags_deep) opts.flatten_tags_deep = {};
  
  if (!opts.allow_tags_direct) opts.allow_tags_direct = {};
  if (!opts.allow_tags_deep) opts.allow_tags_deep = {};
  
  if (!opts.allow_attributes_by_tag) opts.allow_attributes_by_tag = {};
  if (!opts.allow_classes_by_tag) opts.allow_classes_by_tag = {};
  

  
  var parents = [];
  var parent_nodenames = [];
  var regexps = {};
  
  parents.unshift(node);
  parent_nodenames.unshift(node.nodeName);
  if (mode == 'node') {
    sanitizeNode(node);
  } else if (mode == 'children'){
    sanitizeChildNodes(node);
  }

  function compileAndCacheRegex(str) {
    let re = regexps[str];
    if (!re) {
      re = new RegExp(`^${str}$`, 'g');
      regexps[str] = re;
    }
    return re;
  }

  function getValuesForTagname(obj, tagname) {
    let tag_rx_strs = Object.getOwnPropertyNames(obj);
    let values = [];
    for (let tag_rx_str of tag_rx_strs) {
      let tag_rx = compileAndCacheRegex(tag_rx_str);
      if (tagname.match(tag_rx)) {
        values = values.concat(obj[tag_rx_str]); // works for strings and array of strings!
      }
    }
    return values;
  }

  function getValueRegexsForTagname(obj, tagname) {
    let regex_strs = getValuesForTagname(obj, tagname);
    let regexes = regex_strs.map(rx_str => compileAndCacheRegex(rx_str));
    return regexes;
  }

  function matchesAny(obj, tagname, val) {
    return getValueRegexsForTagname(obj, tagname).some(rx => val.match(rx) != null);
  }
  
  function isBlank(node) {
    return node.childNodes.length == 0 ||
    node.textContent.length  == 0 ||
    node.textContent.match(/^\s+$/);
  }
  
  function childrenOf(node) {
    let children = [];
    for (let child of node.childNodes) {
      children.push(child);
    }
    return children; // is not 'live', can be safely iterated
  }
  
  function attributesOf(node) {
    let attnames = [];
    for (let i = 0; i < node.attributes.length; i++) {
      attnames.push(node.attributes[i].name);
    }
    return attnames; // is not 'live', can be safely iterated
  }
  
  function classesOf(node) {
    let classes = [];
    for (let kls of node.classList) {
      classes.push(kls);
    }
    return classes; // is not 'live', can be safely iterated
  }
  
  function replaceWithNodes(replaceable, replacements) {
    for (let n of replacements) {
      replaceable.parentNode.insertBefore(n, replaceable);
    }
    replaceable.remove();
  }
  
  function runFiltersOnNode(nd, filters) {
    let removed = false;
    
    let sanitize_skip_filters = nd.sanitize_skip_filters;
    delete nd.sanitize_skip_filters;
    if (sanitize_skip_filters) {
      return false;
    }
    
    let replacements = [];
    for (let filter of filters) {
      
      let result = filter(nd, parents, parent_nodenames);
      if (result === nd) {
        let sanitize_skip_filters = nd.sanitize_skip_filters;
        delete nd.sanitize_skip_filters;
        if (sanitize_skip_filters) {
          break;
        } else {
          continue;
        }
        
      } else if (result instanceof Array) {
        replaceWithNodes(nd, result);
        removed = true;
        replacements = replacements.concat(result);
        
      } else if (result) {
        nd.parentNode.replaceChild(result, nd);
        removed = true;
        replacements.push(result);
        
      } else {
        nd.remove();
        removed = true;
      }
      
      for (let r of replacements) {
        if (r.nodeName == nd.nodeName) {
          if (typeof r.sanitize_skip_filters == 'undefined') {
            throw new Error(`Prevented possible infinite loop. Filter function '${filter.prototype.constructor.name || 'anonymous'}' has returned a node of type '${r.nodeName}' which has the same nodeName as the original node. This can lead to an infinite loop if the filter always returns the same result. To get rid of this warning, the filter must set the property 'sanitize_skip_filters' on the returned node (evaluating to true or false) to signal if the returned node is to be sanitized again (false) or not (true).`);
          }
        }
        
        sanitizeNode(r);
      }
      
      break;
    }
  
    return removed;
  }
  
  function filterClassesForNode(nd) {
    let nodename = nd.nodeName;

    for (let classname of classesOf(nd)) {
      
      let keep = matchesAny(opts.allow_classes_by_tag, nodename, classname);
      if (!keep) {
        nd.classList.remove(classname);
        continue;
      }
    }
    if (nd.hasAttribute('class') && nd.classList.length === 0) {
      nd.attributes.removeNamedItem('class');
    }
  }
  
  function filterAttributesForNode(nd) {
    for (let attname of attributesOf(nd)) {
      if (!matchesAny(opts.allow_attributes_by_tag, nd.nodeName, attname)) {
        nd.attributes.removeNamedItem(attname);
        continue;
      }
    }
  }
  
  function childNodesToFragment(nd) {
    // Make children into siblings by moving.
    var fragment = doc.createDocumentFragment();
    for (let c of childrenOf(nd)) {
      fragment.appendChild(c);
    }
    return fragment;
  }
  
  function childNodesToSanitizedSiblings(nd) {
    let fragment = childNodesToFragment(nd);
    sanitizeChildNodes(fragment);
    nd.parentNode.insertBefore(fragment, nd);
    nd.remove();
  }
  
  function sanitizeNode(nd) {
    if (nd.sanitize_skip) {
      delete nd.sanitize_skip;
      return;
    }
    
    let tagname = nd.nodeName;
    
    if (nd.nodeType == 3) {
      tagname = 'TEXT'; // instead of #text for easier attribute accessors
    }
    
    let filters = getValuesForTagname(opts.filters_by_tag, tagname);
    if (runFiltersOnNode(nd, filters)) {
      // nd has been removed, continue with siblings
      return;
    }
  
    if (nd.nodeType == 3) { // Nothing to do for a plain-text node.
      return;
    }
      
    if (
      matchesAny(opts.remove_tags_direct, parents[0].nodeName, tagname) ||
      parent_nodenames.some(pnn => matchesAny(opts.remove_tags_deep, pnn, tagname))
    ) {
      nd.remove();
      return;
    }
    
    if (
      matchesAny(opts.flatten_tags_direct, parents[0].nodeName, tagname) ||
      parent_nodenames.some(pnn => matchesAny(opts.flatten_tags_deep, pnn, tagname))
    ) {
      // Flatten node.
      childNodesToSanitizedSiblings(nd);
      return;
    }
    
    if (
      matchesAny(opts.allow_tags_direct, parents[0].nodeName, tagname) ||
      parent_nodenames.some(pnn => matchesAny(opts.allow_tags_deep, pnn, tagname))
    ) {
      
      if (!nd.sanitize_skip_filter_attributes) {
        filterAttributesForNode(nd); 
      }
      
      if (!nd.sanitize_skip_filter_classes) {
        filterClassesForNode(nd);
      }
      
      // -- RECURSION --
      parents.unshift(nd);
      parent_nodenames.unshift(nd.nodeName);
      sanitizeChildNodes(nd);
      parents.shift();
      parent_nodenames.shift();
      // -- RECURSION --
      
      return;
    }
    
    // If nothing else handled this node, flatten it.
    childNodesToSanitizedSiblings(nd);
  }
  

  function sanitizeChildNodes(parent) {
    // parent may be BODY or DocumentFragment
    let allow_empty_tags = ['IMG', 'IFRAME', 'HR', 'BR'];
    for (let nd of childrenOf(parent)) {
      sanitizeNode(nd);

      if (
        opts.remove_empty &&
        nd.nodeType == 1 &&
        !allow_empty_tags.includes(nd.nodeName) &&
        isBlank(nd)
      ) {
        nd.remove();
      }
    }
  }
}

module.exports = sanitizeDom;