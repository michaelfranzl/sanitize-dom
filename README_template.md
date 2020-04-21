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

{{>main}}
