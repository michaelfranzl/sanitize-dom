# sanitize-dom

![Test](https://github.com/michaelfranzl/sanitize-dom/workflows/Test/badge.svg?branch=master)

Recursive sanitizer/filter to manipulate live [WHATWG DOM](https://dom.spec.whatwg.org)s rather than HTML, for the browser and Node.js.

## Rationale

Direct DOM manipulation has gotten a bad reputation in the last decade of web development. From Ruby on Rails to React, the DOM was seen as something to gloriously destroy and re-render from the server or even from the browser. Never mind that the browser already exerted a lot of effort parsing HTML and constructing this tree! Mind-numbingly complex HTML string regular expression tests and manipulations had to deal with low-level details of the HTML syntax to insert, delete and change elements, sometimes on every keystroke! Contrasting to that, functions like `createElement`, `remove` and `insertBefore` from the DOM world were largely unknown and unused, except perhaps in jQuery.

Processing of HTML is **destructive**: The original DOM is destroyed and garbage collected with a certain time delay. Attached event handlers are detached and garbage collected. A completely new DOM is created from parsing new HTML set via `.innerHTML =`. Event listeners will have to be re-attached from the user-land (this is no issue when using `on*` HTML attributes, but this has disadvantages as well).

*It doesn't have to be this way. Do not eliminate, but manipulate!*

### Save the (DOM) trees!

`sanitize-dom` crawls a DOM subtree (beginning from a given node, all the way down to its ancestral leaves) and filters and manipulates it non-destructively. This is very efficient: The browser doesn't have to re-render everything; it only re-renders what has been *changed* (sound familiar from React?).

The benefits of direct DOM manipulation:

* Nodes stay alive.
* References to nodes (i.e. stored in a `Map` or `WeakMap`) stay alive.
* Already attached event handlers stay alive.
* The browser doesn't have to re-render entire sections of a page; thus no flickering, no scroll jumping, no big CPU spikes.
* CPU cycles for repeatedly parsing and dumping of HTML are eliminated.

`sanitize-dom`s further advantages:

* No dependencies.
* Small footprint (only about 7 kB minimized).
* Faster than other HTML sanitizers because there is no HTML parsing and serialization.

## Use cases

Aside from the browser, `sanitize-dom` can also be used in Node.js by supplying WHATWG DOM implementations like [jsdom](https://github.com/tmpvar/jsdom).

The [test file](test/run-tests.js) describes additional usage patterns and features.

For the usage examples below, I'll use `sanitizeHtml` just to be able to illustrate the HTML output.

By default, all tags are 'flattened', i.e. only their inner text is kept:

```javascript
sanitizeHtml(document, '<div><p>abc <b>def</b></p></div>');
"abc def"
```

Selective joining of same-tag siblings:

```javascript
// Joins the two I tags.
sanitizeHtml(document, '<i>Hello</i> <i>world!</i> <em>Goodbye</em> <em>world!</em>', {
  allow_tags_deep: { '.*': '.*' },
  join_siblings: ['I'],
});
"<i>Hello world!</i> <em>Goodbye</em> <em>world!</em>"
```

Removal of redundant nested nodes (ubiquitous when using a WYSIWYG `contenteditable` editor):

```javascript
sanitizeHtml(document, '<i><i>H<i></i>ello</i> <i>world! <i>Good<i>bye</i></i> world!</i>', {
  allow_tags_deep: { '.*': '.*' },
  flatten_tags_deep: { i: 'i' },
});
"<i>Hello  world! Goodbye world!</i>"
```

Remove redundant empty tags:

```javascript
sanitizeHtml(document, 'H<i></i>ello world!', {
  allow_tags_deep: { '.*': '.*' },
  remove_empty: true,
});
"Hello world!"
```

By default, all classes and attributes are removed:

```javascript
// Keep all nodes, but remove all of their attributes and classes:
sanitizeHtml(document, '<div><p>abc <b class="green" data-type="test">def</b></p></div>', {
  allow_tags_deep: { '.*': '.*' },
});
"<div><p>abc <b>def</b></p></div>"
```

Keep all nodes and all their attributes and classes:

```javascript
sanitizeHtml(document, '<div><p class="red green">abc <b class="green" data-type="test">def</b></p></div>', {
  allow_tags_deep: { '.*': '.*' },
  allow_attributes_by_tag: { '.*': '.*' },
  allow_classes_by_tag: { '.*': '.*' },
});
'<div><p class="red green">abc <b class="green" data-type="test">def</b></p></div>'
```

White-listing of classes and attributes:

```javascript
// Keep only data- attributes and 'green' classes
sanitizeHtml(document, '<div><p class="red green">abc <b class="green" data-type="test">def</b></p></div>', {
  allow_tags_deep: { '.*': '.*' },
  allow_attributes_by_tag: { '.*': 'data-.*' },
  allow_classes_by_tag: { '.*': 'green' },
});
'<div><p class="green">abc <b class="green" data-type="test">def</b></p></div>'
```

White-listing of node tags to keep:

```javascript
// Keep only B tags anywhere in the document.
sanitizeHtml(document, '<i>abc</i> <b>def</b> <em>ghi</em>', {
  allow_tags_deep: { '.*': '^b$' },
});
"abc <b>def</b> ghi"

// Keep only DIV children of BODY and I children of DIV.
sanitizeHtml(document, '<div> <i>abc</i> <em>def</em></div> <i>ghi</i>', {
  allow_tags_direct: {
    body: 'div',
    div: '^i',
  },
});
"<div> <i>abc</i> def</div> ghi"
```

Selective flattening of nodes:

```javascript
// Flatten only EM children of DIV.
sanitizeHtml(document, '<div> <i>abc</i> <em>def</em></div> <i>ghi</i>', {
  allow_tags_deep: { '.*': '.*' },
  flatten_tags_direct: {
    div: 'em',
  },
});
"<div> <i>abc</i> def</div> <i>ghi</i>"

// Flatten I tags anywhere in the document.
sanitizeHtml(document, '<div> <i>abc</i> <em>def</em></div> <i>ghi</i>', {
  allow_tags_deep: { '.*': '.*' },
  flatten_tags_deep: {
    '.*': '^i',
  },
});
"<div> abc <em>def</em></div> ghi"
```

Selective removal of tags:

```javascript
// Remove I children of DIVs.
sanitizeHtml(document, '<div> <i>abc</i> <em>def</em></div> <i>ghi</i>', {
  allow_tags_deep: { '.*': '.*' },
  remove_tags_direct: {
    'div': 'i',
  },
});
"<div>  <em>def</em></div> <i>ghi</i>"
```

Then, sometimes there are more than one way to accomplish the same, as shown in this advanced
example:

```javascript
// Keep all tags except B, anywhere in the document. Two different solutions:

sanitizeHtml(document, '<div> <i>abc</i> <b>def</b> <em>ghi</em> </div>', {
  allow_tags_deep: { '.*': '.*' },
  flatten_tags_deep: { '.*': 'B' },
});
"<div> <i>abc</i> def <em>ghi</em> </div>"

sanitizeHtml(document, '<div> <i>abc</i> <b>def</b> <em>ghi</em> </div>', {
  allow_tags_deep: { '.*': '^((?!b).)*$' }
});
"<div> <i>abc</i> def <em>ghi</em> </div>"
```

And finally, filter functions allow ultimate flexibility:

```javascript
// change B node to EM node with contextual inner text; attach an event listener.
sanitizeHtml(document, '<p>abc <i><b>def</b> <b>ghi</b></i></p>', {
  allow_tags_direct: {
    '.*': '.*',
  },
  filters_by_tag: {
    B: [
      function changesToEm(node, { parentNodes, parentNodenames, siblingIndex }) {
        const em = document.createElement('em');
        const text = `${parentNodenames.join(', ')} - ${siblingIndex}`;
        em.innerHTML = text;
        em.addEventListener('click', () => alert(text));
        return em;
      },
    ],
  },
});
// In a browser, the EM tags would be clickable and an alert box would pop up.
"<p>abc <i><em>I, P, BODY - 0</em> <em>I, P, BODY - 2</em></i></p>"
```

## Tests

Run in Node.js:

```sh
npm test
```

For the browser, run:

```sh
cd sanitize-dom
npm i -g jspm@2.0.0-beta.7 http-server
jspm install @jspm/core@1.1.0
http-server
```

Then, in a browser which supports `<script type="importmap"></script>` (e.g. Google Chrome
version >= 81), browse to http://127.0.0.1:8080/test

# API Reference

## Functions

<dl>
<dt><a href="#sanitizeNode">sanitizeNode(doc, node, [opts], [nodePropertyMap])</a></dt>
<dd><p>Simple wrapper for <a href="#sanitizeDom">sanitizeDom</a>. Processes the node and its childNodes recursively.</p>
</dd>
<dt><a href="#sanitizeChildNodes">sanitizeChildNodes(doc, node, [opts], [nodePropertyMap])</a></dt>
<dd><p>Simple wrapper for <a href="#sanitizeDom">sanitizeDom</a>. Processes only the node&#39;s childNodes recursively, but not
the node itself.</p>
</dd>
<dt><a href="#sanitizeHtml">sanitizeHtml(doc, html, [opts], [isDocument], [nodePropertyMap])</a> ⇒ <code>String</code></dt>
<dd><p>Simple wrapper for <a href="#sanitizeDom">sanitizeDom</a>. Instead of a DomNode, it takes an HTML string.</p>
</dd>
<dt><a href="#sanitizeDom">sanitizeDom(doc, contextNode, [opts], [childrenOnly], [nodePropertyMap])</a></dt>
<dd><p>This function is not exported: Please use the wrapper functions instead:</p>
<p><a href="#sanitizeHtml">sanitizeHtml</a>, <a href="#sanitizeNode">sanitizeNode</a>, and <a href="#sanitizeChildNodes">sanitizeChildNodes</a>.</p>
<p>Recursively processes a tree with <code>node</code> at the root.</p>
<p>In all descriptions, the term &quot;flatten&quot; means that a node is replaced with the node&#39;s childNodes.
For example, if the B node in <code>&lt;i&gt;abc&lt;b&gt;def&lt;u&gt;ghi&lt;/u&gt;&lt;/b&gt;&lt;/i&gt;</code> is flattened, the result is
<code>&lt;i&gt;abcdef&lt;u&gt;ghi&lt;/u&gt;&lt;/i&gt;</code>.</p>
<p>Each node is processed in the following sequence:</p>
<ol>
<li>Filters matching the <code>opts.filters_by_tag</code> spec are called. If the filter returns <code>null</code>, the
node is removed and processing stops (see <a href="#filter">filter</a>s).</li>
<li>If the <code>opts.remove_tags_*</code> spec matches, the node is removed and processing stops.</li>
<li>If the <code>opts.flatten_tags_*</code> spec matches, the node is flattened and processing stops.</li>
<li>If the <code>opts.allow_tags_*</code> spec matches:<ul>
<li>All attributes not matching <code>opts.allow_attributes_by_tag</code> are removed.</li>
<li>All class names not matching <code>opts.allow_classes_by_tag</code> are removed.</li>
<li>The node is kept and processing stops.</li>
</ul>
</li>
<li>The node is flattened.</li>
</ol>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#DomDocument">DomDocument</a> : <code>Object</code></dt>
<dd><p>Implements the WHATWG DOM Document interface.</p>
<p>In the browser, this is <code>window.document</code>. In Node.js, this may for example be
<a href="https://github.com/tmpvar/jsdom">new JSDOM().window.document</a>.</p>
</dd>
<dt><a href="#DomNode">DomNode</a> : <code>Object</code></dt>
<dd><p>Implements the WHATWG DOM Node interface.</p>
<p>Custom properties for each node can be stored in a <code>WeakMap</code> passed as option <code>nodePropertyMap</code>
to one of the sanitize functions.</p>
</dd>
<dt><a href="#Tagname">Tagname</a> : <code>string</code></dt>
<dd><p>Node tag name.</p>
<p>Even though in the WHATWG DOM text nodes (nodeType 3) have a tag name <code>#text</code>,
these are referred to by the simpler string &#39;TEXT&#39; for convenience.</p>
</dd>
<dt><a href="#Regex">Regex</a> : <code>string</code></dt>
<dd><p>A string which is compiled to a case-insensitive regular expression <code>new RegExp(regex, &#39;i&#39;)</code>.
The regular expression is used to match a <a href="#Tagname">Tagname</a>.</p>
</dd>
<dt><a href="#ParentChildSpec">ParentChildSpec</a> : <code>Object.&lt;Regex, Array.&lt;Regex&gt;&gt;</code></dt>
<dd><p>Property names are matched against a (direct or ancestral) parent node&#39;s <a href="#Tagname">Tagname</a>.
Associated values are matched against the current nodes <a href="#Tagname">Tagname</a>.</p>
</dd>
<dt><a href="#TagAttributeNameSpec">TagAttributeNameSpec</a> : <code>Object.&lt;Regex, Array.&lt;Regex&gt;&gt;</code></dt>
<dd><p>Property names are matched against the current nodes <a href="#Tagname">Tagname</a>. Associated values are
used to match its attribute names.</p>
</dd>
<dt><a href="#TagClassNameSpec">TagClassNameSpec</a> : <code>Object.&lt;Regex, Array.&lt;Regex&gt;&gt;</code></dt>
<dd><p>Property names are matched against the current nodes <a href="#Tagname">Tagname</a>. Associated values are used
to match its class names.</p>
</dd>
<dt><a href="#FilterSpec">FilterSpec</a> : <code>Object.&lt;Regex, Array.&lt;filter&gt;&gt;</code></dt>
<dd><p>Property names are matched against node <a href="#Tagname">Tagname</a>s. Associated values
are the <a href="#filter">filter</a>s which are run on the node.</p>
</dd>
<dt><a href="#filter">filter</a> ⇒ <code><a href="#DomNode">DomNode</a></code> | <code><a href="#DomNode">Array.&lt;DomNode&gt;</a></code> | <code>null</code></dt>
<dd><p>Filter functions can either...</p>
<ol>
<li>return the same node (the first argument),</li>
<li>return a single, or an Array of, newly created <a href="#DomNode">DomNode</a>(s), in which case <code>node</code> is
replaced with the new node(s),</li>
<li>return <code>null</code>, in which case <code>node</code> is removed.</li>
</ol>
<p>Note that newly generated <a href="#DomNode">DomNode</a>(s) are processed by running <a href="#sanitizeDom">sanitizeDom</a>
on them, as if they had been part of the original tree. This has the following implication:</p>
<p>If a filter returns a newly generated <a href="#DomNode">DomNode</a> with the same <a href="#Tagname">Tagname</a> as <code>node</code>, it
would cause the same filter to be called again, which may lead to an infinite loop if the filter
is always returning the same result (this would be a badly behaved filter). To protect against
infinite loops, the author of the filter must acknowledge this circumstance by setting a boolean
property called &#39;skip_filters&#39; for the <a href="#DomNode">DomNode</a>) (in a <code>WeakMap</code> which the caller must
provide to one of the sanitize functions as the argument <code>nodePropertyMap</code>). If &#39;skip_filters&#39; is
not set, an error is thrown. With well-behaved filters it is possible to continue subsequent
processing of the returned node without causing an infinite loop.</p>
</dd>
</dl>

<a name="sanitizeNode"></a>

## sanitizeNode(doc, node, [opts], [nodePropertyMap])
Simple wrapper for [sanitizeDom](#sanitizeDom). Processes the node and its childNodes recursively.

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| doc | [<code>DomDocument</code>](#DomDocument) |  |  |
| node | [<code>DomNode</code>](#DomNode) |  |  |
| [opts] | <code>Object</code> | <code>{}</code> |  |
| [nodePropertyMap] | <code>WeakMap.&lt;DomNode, Object&gt;</code> | <code>new WeakMap()</code> | Additional node properties |

<a name="sanitizeChildNodes"></a>

## sanitizeChildNodes(doc, node, [opts], [nodePropertyMap])
Simple wrapper for [sanitizeDom](#sanitizeDom). Processes only the node's childNodes recursively, but not
the node itself.

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| doc | [<code>DomDocument</code>](#DomDocument) |  |  |
| node | [<code>DomNode</code>](#DomNode) |  |  |
| [opts] | <code>Object</code> | <code>{}</code> |  |
| [nodePropertyMap] | <code>WeakMap.&lt;DomNode, Object&gt;</code> | <code>new WeakMap()</code> | Additional node properties |

<a name="sanitizeHtml"></a>

## sanitizeHtml(doc, html, [opts], [isDocument], [nodePropertyMap]) ⇒ <code>String</code>
Simple wrapper for [sanitizeDom](#sanitizeDom). Instead of a DomNode, it takes an HTML string.

**Kind**: global function  
**Returns**: <code>String</code> - The processed HTML  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| doc | [<code>DomDocument</code>](#DomDocument) |  |  |
| html | <code>string</code> |  |  |
| [opts] | <code>Object</code> | <code>{}</code> |  |
| [isDocument] | <code>Boolean</code> | <code>false</code> | Set this to `true` if you are passing an entire HTML document (beginning with the <html> tag). The context node name will be HTML. If `false`, then the context node name will be BODY. |
| [nodePropertyMap] | <code>WeakMap.&lt;DomNode, Object&gt;</code> | <code>new WeakMap()</code> | Additional node properties |

<a name="sanitizeDom"></a>

## sanitizeDom(doc, contextNode, [opts], [childrenOnly], [nodePropertyMap])
This function is not exported: Please use the wrapper functions instead:

[sanitizeHtml](#sanitizeHtml), [sanitizeNode](#sanitizeNode), and [sanitizeChildNodes](#sanitizeChildNodes).

Recursively processes a tree with `node` at the root.

In all descriptions, the term "flatten" means that a node is replaced with the node's childNodes.
For example, if the B node in `<i>abc<b>def<u>ghi</u></b></i>` is flattened, the result is
`<i>abcdef<u>ghi</u></i>`.

Each node is processed in the following sequence:

1. Filters matching the `opts.filters_by_tag` spec are called. If the filter returns `null`, the
   node is removed and processing stops (see [filter](#filter)s).
2. If the `opts.remove_tags_*` spec matches, the node is removed and processing stops.
3. If the `opts.flatten_tags_*` spec matches, the node is flattened and processing stops.
4. If the `opts.allow_tags_*` spec matches:
    * All attributes not matching `opts.allow_attributes_by_tag` are removed.
    * All class names not matching `opts.allow_classes_by_tag` are removed.
    * The node is kept and processing stops.
5. The node is flattened.

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| doc | [<code>DomDocument</code>](#DomDocument) |  | The document |
| contextNode | [<code>DomNode</code>](#DomNode) |  | The root node |
| [opts] | <code>Object</code> | <code>{}</code> | Options for processing. |
| [opts.filters_by_tag] | [<code>FilterSpec</code>](#FilterSpec) | <code>{}</code> | Matching filters are called with the node. |
| [opts.remove_tags_direct] | [<code>ParentChildSpec</code>](#ParentChildSpec) | <code>{}</code> | Matching nodes which are a direct child of the matching parent node are removed. |
| [opts.remove_tags_deep] | [<code>ParentChildSpec</code>](#ParentChildSpec) | <code>{&#x27;.*&#x27;: [&#x27;style&#x27;,&#x27;script&#x27;,&#x27;textarea&#x27;,&#x27;noscript&#x27;]}</code> | Matching nodes which are anywhere below the matching parent node are removed. |
| [opts.flatten_tags_direct] | [<code>ParentChildSpec</code>](#ParentChildSpec) | <code>{}</code> | Matching nodes which are a direct child of the matching parent node are flattened. |
| [opts.flatten_tags_deep] | [<code>ParentChildSpec</code>](#ParentChildSpec) | <code>{}</code> | Matching nodes which are anywhere below the matching parent node are flattened. |
| [opts.allow_tags_direct] | [<code>ParentChildSpec</code>](#ParentChildSpec) | <code>{}</code> | Matching nodes which are a direct child of the matching parent node are kept. |
| [opts.allow_tags_deep] | [<code>ParentChildSpec</code>](#ParentChildSpec) | <code>{}</code> | Matching nodes which are anywhere below the matching parent node are kept. |
| [opts.allow_attributes_by_tag] | [<code>TagAttributeNameSpec</code>](#TagAttributeNameSpec) | <code>{}</code> | Matching attribute names of a matching node are kept. Other attributes are removed. |
| [opts.allow_classes_by_tag] | [<code>TagClassNameSpec</code>](#TagClassNameSpec) | <code>{}</code> | Matching class names of a matching node are kept. Other class names are removed. If no class names are remaining, the class attribute is removed. |
| [opts.remove_empty] | <code>boolean</code> | <code>false</code> | Remove nodes which are completely empty |
| [opts.join_siblings] | [<code>Array.&lt;Tagname&gt;</code>](#Tagname) | <code>[]</code> | Join same-tag sibling nodes of given tag names, unless they are separated by non-whitespace textNodes. |
| [childrenOnly] | <code>Bool</code> | <code>false</code> | If false, then the node itself and its descendants are processed recursively. If true, then only the children and its descendants are processed recursively, but not the node itself (use when `node` is `BODY` or `DocumentFragment`). |
| [nodePropertyMap] | <code>WeakMap.&lt;DomNode, Object&gt;</code> | <code>new WeakMap()</code> | Additional properties for a [DomNode](#DomNode) can be stored in an object and will be looked up in this map. The properties of the object and their meaning: `skip`: If truthy, disables all processing for this node. `skip_filters`: If truthy, disables all filters for this node. `skip_classes`: If truthy, disables processing classes of this node.  `skip_attributes`: If truthy, disables processing attributes of this node. See tests for usage details. |

<a name="DomDocument"></a>

## DomDocument : <code>Object</code>
Implements the WHATWG DOM Document interface.

In the browser, this is `window.document`. In Node.js, this may for example be
[new JSDOM().window.document](https://github.com/tmpvar/jsdom).

**Kind**: global typedef  
**See**: [https://dom.spec.whatwg.org/#interface-document](https://dom.spec.whatwg.org/#interface-document)  
<a name="DomNode"></a>

## DomNode : <code>Object</code>
Implements the WHATWG DOM Node interface.

Custom properties for each node can be stored in a `WeakMap` passed as option `nodePropertyMap`
to one of the sanitize functions.

**Kind**: global typedef  
**See**: [https://dom.spec.whatwg.org/#interface-node](https://dom.spec.whatwg.org/#interface-node)  
<a name="Tagname"></a>

## Tagname : <code>string</code>
Node tag name.

Even though in the WHATWG DOM text nodes (nodeType 3) have a tag name `#text`,
these are referred to by the simpler string 'TEXT' for convenience.

**Kind**: global typedef  
**Example**  
```js
'DIV'
'H1'
'TEXT'
```
<a name="Regex"></a>

## Regex : <code>string</code>
A string which is compiled to a case-insensitive regular expression `new RegExp(regex, 'i')`.
The regular expression is used to match a [Tagname](#Tagname).

**Kind**: global typedef  
**Example**  
```js
'.*'           // matches any tag
'DIV'          // matches DIV
'(DIV|H[1-3])' // matches DIV, H1, H2 and H3
'P'            // matches P and SPAN
'^P$'          // matches P but not SPAN
'TEXT'         // matches text nodes (nodeType 3)
```
<a name="ParentChildSpec"></a>

## ParentChildSpec : <code>Object.&lt;Regex, Array.&lt;Regex&gt;&gt;</code>
Property names are matched against a (direct or ancestral) parent node's [Tagname](#Tagname).
Associated values are matched against the current nodes [Tagname](#Tagname).

**Kind**: global typedef  
**Example**  
```js
{
  '(DIV|SPAN)': ['H[1-3]', 'B'], // matches H1, H2, H3 and B within DIV or SPAN
  'STRONG': ['.*'] // matches all tags within STRONG
}
```
<a name="TagAttributeNameSpec"></a>

## TagAttributeNameSpec : <code>Object.&lt;Regex, Array.&lt;Regex&gt;&gt;</code>
Property names are matched against the current nodes [Tagname](#Tagname). Associated values are
used to match its attribute names.

**Kind**: global typedef  
**Example**  
```js
{
  'H[1-3]': ['id', 'class'], // matches 'id' and 'class' attributes of all H1, H2 and H3 nodes
  'STRONG': ['data-.*'] // matches all 'data-.*' attributes of STRONG nodes.
}
```
<a name="TagClassNameSpec"></a>

## TagClassNameSpec : <code>Object.&lt;Regex, Array.&lt;Regex&gt;&gt;</code>
Property names are matched against the current nodes [Tagname](#Tagname). Associated values are used
to match its class names.

**Kind**: global typedef  
**Example**  
```js
{
  'DIV|SPAN': ['blue', 'red'] // matches 'blue' and 'red' class names of all DIV and SPAN nodes
}
```
<a name="FilterSpec"></a>

## FilterSpec : <code>Object.&lt;Regex, Array.&lt;filter&gt;&gt;</code>
Property names are matched against node [Tagname](#Tagname)s. Associated values
are the [filter](#filter)s which are run on the node.

**Kind**: global typedef  
<a name="filter"></a>

## filter ⇒ [<code>DomNode</code>](#DomNode) \| [<code>Array.&lt;DomNode&gt;</code>](#DomNode) \| <code>null</code>
Filter functions can either...

1. return the same node (the first argument),
2. return a single, or an Array of, newly created [DomNode](#DomNode)(s), in which case `node` is
replaced with the new node(s),
3. return `null`, in which case `node` is removed.

Note that newly generated [DomNode](#DomNode)(s) are processed by running [sanitizeDom](#sanitizeDom)
on them, as if they had been part of the original tree. This has the following implication:

If a filter returns a newly generated [DomNode](#DomNode) with the same [Tagname](#Tagname) as `node`, it
would cause the same filter to be called again, which may lead to an infinite loop if the filter
is always returning the same result (this would be a badly behaved filter). To protect against
infinite loops, the author of the filter must acknowledge this circumstance by setting a boolean
property called 'skip_filters' for the [DomNode](#DomNode)) (in a `WeakMap` which the caller must
provide to one of the sanitize functions as the argument `nodePropertyMap`). If 'skip_filters' is
not set, an error is thrown. With well-behaved filters it is possible to continue subsequent
processing of the returned node without causing an infinite loop.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| node | [<code>DomNode</code>](#DomNode) | Currently processed node |
| opts | <code>Object</code> |  |
| opts.parents | [<code>Array.&lt;DomNode&gt;</code>](#DomNode) | The parent nodes of `node`. |
| opts.parentNodenames | [<code>Array.&lt;Tagname&gt;</code>](#Tagname) | The tag names of the parent nodes |
| opts.siblingIndex | <code>Integer</code> | The number of the current node amongst its siblings |

