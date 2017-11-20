# sanitize-dom

Recursive sanitizer/filter for [WHATWG DOM](https://dom.spec.whatwg.org)s. Flexible use cases with convenient configuration options. More complex filtering can be implemented via filters (callback functions).

This project is similar to [sanitize-html](https://github.com/punkave/sanitize-html) but works with the bare-metal DOM API rather than with HTML strings. Because it leverages the browser's own HTML parsing, it has a very small footprint and works in all modern browsers. It also works in Node.js by using an WHATWG DOM implementation like [jsdom](https://github.com/tmpvar/jsdom).

Read the extensive [test cases](tests/test.js) to see how sanitize-dom can be useful.

Run tests with

    npm test
    
Run code coverage test with

    npm run coverage

# API Reference

## Functions

<dl>
<dt><a href="#sanitizeNode">sanitizeNode()</a></dt>
<dd><p>Simple wrapper for <a href="#sanitizeDom">sanitizeDom</a> but sets <code>mode=&#39;node&#39;</code>, thus processes
the node itself and its childNodes recursively.</p>
</dd>
<dt><a href="#sanitizeChildNodes">sanitizeChildNodes()</a></dt>
<dd><p>Simple wrapper for <a href="#sanitizeDom">sanitizeDom</a> but sets <code>mode=&#39;children&#39;</code>, thus processes
only the node&#39;s childNodes recursively, but not the node itself.</p>
</dd>
<dt><a href="#sanitizeHtml">sanitizeHtml()</a> ⇒ <code><a href="#DomNode">Array.&lt;DomNode&gt;</a></code></dt>
<dd><p>Simple wrapper for <a href="#sanitizeDom">sanitizeDom</a>. Instead of a DomNode, it takes an
HTML string, converts it to a sandboxed document (no scripts are executed, no
remote content fetched) and runs sanitizeDom on it.</p>
</dd>
<dt><a href="#sanitizeDom">sanitizeDom(doc, node, [mode], [opts])</a></dt>
<dd><p>Recursively processes a tree with <code>node</code> at the root.</p>
<p>In all descriptions, the term &quot;flatten&quot; means that a node is replaced with the node&#39;s childNodes. For example, if the B node in <code>&lt;i&gt;abc&lt;b&gt;def&lt;u&gt;ghi&lt;/u&gt;&lt;/b&gt;&lt;/i&gt;</code> is flattened, the result is <code>&lt;i&gt;abcdef&lt;u&gt;ghi&lt;/u&gt;&lt;/i&gt;</code>.</p>
<p>Each node is processed in the following sequence:</p>
<ol>
<li>Filters matching the <code>opts.filters_by_tag</code> spec are called. If the filter returns <code>null</code>, the node is removed and processing stops (see <a href="#filter">filter</a>s).</li>
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
<p>In addition, two custom property names are recognized (see properties below).
These custom properties may be set by <a href="#filter">filter</a>s or by the user
before <a href="#sanitizeDom">sanitizeDom</a> is run. <a href="#sanitizeDom">sanitizeDom</a> removes those
attributes from the DomNode after each run.</p>
</dd>
<dt><a href="#Tagname">Tagname</a> : <code>string</code></dt>
<dd><p>All-uppercase node tag name.</p>
<p>Even though in the WHATWG DOM text nodes (nodeType 3) have a tag name &#39;#text&#39;,
these are referred to by the simpler string &#39;TEXT&#39; for convenience.</p>
</dd>
<dt><a href="#Regex">Regex</a> : <code>string</code></dt>
<dd><p>A string which is compiled to a regular expression with <code>new RegExp(&#39;^&#39; + Regex + &#39;$&#39;)</code>. The regular expression is used to match a <a href="#Tagname">Tagname</a>.</p>
</dd>
<dt><a href="#ParentChildSpec">ParentChildSpec</a> : <code>Object.&lt;Regex, Array.&lt;Regex&gt;&gt;</code></dt>
<dd><p>Property names are matched against a parent node&#39;s <a href="#Tagname">Tagname</a>. Associated values are matched against a children node&#39;s <a href="#Tagname">Tagname</a>. If parent and child
must be direct or deep descendants depends on the usage of this type.</p>
</dd>
<dt><a href="#TagAttributeNameSpec">TagAttributeNameSpec</a> : <code>Object.&lt;Regex, Array.&lt;Regex&gt;&gt;</code></dt>
<dd><p>Property names are matched against a node&#39;s <a href="#Tagname">Tagname</a>. Associated values are used to match attribute names.</p>
</dd>
<dt><a href="#TagClassNameSpec">TagClassNameSpec</a> : <code>Object.&lt;Regex, Array.&lt;Regex&gt;&gt;</code></dt>
<dd><p>Property names are matched against a node&#39;s <a href="#Tagname">Tagname</a>. Associated values are used to match class names.</p>
</dd>
<dt><a href="#FilterSpec">FilterSpec</a> : <code>Object.&lt;Regex, Array.&lt;filter&gt;&gt;</code></dt>
<dd><p>Property names are matched against node <a href="#Tagname">Tagname</a>s. Associated values
are the <a href="#filter">filter</a>s which are run on the node.</p>
</dd>
<dt><a href="#filter">filter</a> ⇒ <code><a href="#DomNode">DomNode</a></code> | <code><a href="#DomNode">Array.&lt;DomNode&gt;</a></code> | <code>null</code></dt>
<dd><p>Filter functions can either...</p>
<ol>
<li>optionally modify <code>node</code> and return it again,</li>
<li>return a single, or an Array of, newly created <a href="#DomNode">DomNode</a>(s), in which case <code>node</code> is replaced with the new node(s),</li>
<li>return <code>null</code>, in which case <code>node</code> is removed.</li>
</ol>
<p>Note that newly generated <a href="#DomNode">DomNode</a>(s) are processed by running
<a href="#sanitizeDom">sanitizeDom</a> on them, as if they had been part of the original tree.</p>
<p>If a filter returns a newly generated <a href="#DomNode">DomNode</a> with the same <a href="#Tagname">Tagname</a> as <code>node</code>, it would cause the same filter to be called again, which may lead to an infinite loop if the filter is always returning the same result. In this case, in order to prevent the infinite loop, an exception is thrown immediately. The author of the filter must set custom attributes on the node (see <a href="#DomNode">DomNode</a>), which may or may not stop subsequent processing. With well-behaved filters it is possible to continue subsequent processing.</p>
</dd>
</dl>

<a name="sanitizeNode"></a>

## sanitizeNode()
Simple wrapper for [sanitizeDom](#sanitizeDom) but sets `mode='node'`, thus processes
the node itself and its childNodes recursively.

**Kind**: global function  
<a name="sanitizeChildNodes"></a>

## sanitizeChildNodes()
Simple wrapper for [sanitizeDom](#sanitizeDom) but sets `mode='children'`, thus processes
only the node's childNodes recursively, but not the node itself.

**Kind**: global function  
<a name="sanitizeHtml"></a>

## sanitizeHtml() ⇒ [<code>Array.&lt;DomNode&gt;</code>](#DomNode)
Simple wrapper for [sanitizeDom](#sanitizeDom). Instead of a DomNode, it takes an
HTML string, converts it to a sandboxed document (no scripts are executed, no
remote content fetched) and runs sanitizeDom on it.

**Kind**: global function  
**Returns**: [<code>Array.&lt;DomNode&gt;</code>](#DomNode) - The childNodes of the HTML string.  
<a name="sanitizeDom"></a>

## sanitizeDom(doc, node, [mode], [opts])
Recursively processes a tree with `node` at the root.

In all descriptions, the term "flatten" means that a node is replaced with the node's childNodes. For example, if the B node in `<i>abc<b>def<u>ghi</u></b></i>` is flattened, the result is `<i>abcdef<u>ghi</u></i>`.

Each node is processed in the following sequence:

1. Filters matching the `opts.filters_by_tag` spec are called. If the filter returns `null`, the node is removed and processing stops (see [filter](#filter)s).
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
| node | [<code>DomNode</code>](#DomNode) |  | The root node |
| [mode] | <code>String</code> | <code>node</code> | If 'node' then the node itself and its descendants are processed recursively. If 'children' then the children and its descendants are processed recursively, but not the node itself (useful when `node` is `BODY` or `DocumentFragment`). |
| [opts] | <code>Object</code> | <code>{}</code> | Options for processing. |
| [opts.filters_by_tag] | [<code>FilterSpec</code>](#FilterSpec) | <code>{}</code> | Matching filters are called with the node. |
| [opts.remove_tags_direct] | [<code>ParentChildSpec</code>](#ParentChildSpec) | <code>{}</code> | Matching nodes which are a direct child of the matching parent node are removed. |
| [opts.remove_tags_deep] | [<code>ParentChildSpec</code>](#ParentChildSpec) | <code>{&#x27;.*&#x27;: [&#x27;style&#x27;, &#x27;script&#x27;, &#x27;textarea&#x27;, &#x27;noscript&#x27;]}</code> | Matching nodes which are anywhere below the matching parent node are removed. |
| [opts.flatten_tags_direct] | [<code>ParentChildSpec</code>](#ParentChildSpec) | <code>{}</code> | Matching nodes which are a direct child of the matching parent node are flattened. |
| [opts.flatten_tags_deep] | [<code>ParentChildSpec</code>](#ParentChildSpec) | <code>{}</code> | Matching nodes which are anywhere below the matching parent node are flattened. |
| [opts.allow_tags_direct] | [<code>ParentChildSpec</code>](#ParentChildSpec) | <code>{}</code> | Matching nodes which are a direct child of the matching parent node are kept. |
| [opts.allow_tags_deep] | [<code>ParentChildSpec</code>](#ParentChildSpec) | <code>{}</code> | Matching nodes which are anywhere below the matching parent node are kept. |
| [opts.allow_attributes_by_tag] | [<code>TagAttributeNameSpec</code>](#TagAttributeNameSpec) | <code>{}</code> | Matching attribute names of a matching node are kept. Other attributes are removed. |
| [opts.allow_classes_by_tag] | [<code>TagClassNameSpec</code>](#TagClassNameSpec) | <code>{}</code> | Matching class names of a matching node are kept. Other class names are removed. If no class names are remaining, the class attribute is removed. |
| [opts.remove_empty] | <code>boolean</code> | <code>false</code> | Remove nodes which are completely empty or contain only white space. |

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

In addition, two custom property names are recognized (see properties below).
These custom properties may be set by [filter](#filter)s or by the user
before [sanitizeDom](#sanitizeDom) is run. [sanitizeDom](#sanitizeDom) removes those
attributes from the DomNode after each run.

**Kind**: global typedef  
**See**: [https://dom.spec.whatwg.org/#interface-node](https://dom.spec.whatwg.org/#interface-node)  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| sanitize_skip_filters | <code>boolean</code> | If truthy, disables all filters for this node. |
| sanitize_skip | <code>boolean</code> | If truthy, disables all processing of this node. |

<a name="Tagname"></a>

## Tagname : <code>string</code>
All-uppercase node tag name.

Even though in the WHATWG DOM text nodes (nodeType 3) have a tag name '#text',
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
A string which is compiled to a regular expression with `new RegExp('^' + Regex + '$')`. The regular expression is used to match a [Tagname](#Tagname).

**Kind**: global typedef  
**Example**  
```js
'.*'         // matches any tag
'DIV'        // matches DIV
'DIV|H[1-3]' // matches DIV, H1, H2 and H3
'TEXT'       // matches text nodes (nodeType 3)
```
<a name="ParentChildSpec"></a>

## ParentChildSpec : <code>Object.&lt;Regex, Array.&lt;Regex&gt;&gt;</code>
Property names are matched against a parent node's [Tagname](#Tagname). Associated values are matched against a children node's [Tagname](#Tagname). If parent and child
must be direct or deep descendants depends on the usage of this type.

**Kind**: global typedef  
**Example**  
```js
{
  'DIV|SPAN': ['H[1-3]', 'B'], // matches H1, H2, H3 and B within DIV or SPAN
  'STRONG': ['.*'] // matches all tags within STRONG
}
```
<a name="TagAttributeNameSpec"></a>

## TagAttributeNameSpec : <code>Object.&lt;Regex, Array.&lt;Regex&gt;&gt;</code>
Property names are matched against a node's [Tagname](#Tagname). Associated values are used to match attribute names.

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
Property names are matched against a node's [Tagname](#Tagname). Associated values are used to match class names.

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

1. optionally modify `node` and return it again,
2. return a single, or an Array of, newly created [DomNode](#DomNode)(s), in which case `node` is replaced with the new node(s),
3. return `null`, in which case `node` is removed.

Note that newly generated [DomNode](#DomNode)(s) are processed by running
[sanitizeDom](#sanitizeDom) on them, as if they had been part of the original tree.

If a filter returns a newly generated [DomNode](#DomNode) with the same [Tagname](#Tagname) as `node`, it would cause the same filter to be called again, which may lead to an infinite loop if the filter is always returning the same result. In this case, in order to prevent the infinite loop, an exception is thrown immediately. The author of the filter must set custom attributes on the node (see [DomNode](#DomNode)), which may or may not stop subsequent processing. With well-behaved filters it is possible to continue subsequent processing.

**Kind**: global typedef  

| Param | Type | Description |
| --- | --- | --- |
| node | [<code>DomNode</code>](#DomNode) | Currently processed node |
| parents | [<code>Array.&lt;DomNode&gt;</code>](#DomNode) | The parent nodes of `node`. |
| parent_nodenames | [<code>Array.&lt;Tagname&gt;</code>](#Tagname) | The tag names of the parent nodes, provided for convenience. |




# License

Copyright 2017 Michael Karl Franzl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.