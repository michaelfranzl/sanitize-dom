/* eslint-disable prefer-arrow-callback, func-names */

import assert from 'assert';

import { sanitizeChildNodes } from '../src/index.js';

function runTests(doc, container) {

  const nodePropertyMap = new WeakMap();

  function sanitizeHtml(html, opts = {}) {
    container.innerHTML = html;
    sanitizeChildNodes(doc, container, nodePropertyMap, opts);
    return container.innerHTML;
  }

  describe('initialization', () => {
    it('throws when no DOM API passed in', () => {
      assert.throws(
        (function () {
          return function () {
            const node = doc.createElement('div');
            sanitizeChildNodes({}, node, nodePropertyMap);
          };
        }()), /Need DOM Document interface/,
      );
    });

    it('throws when node of wrong interface passed in', () => {
      assert.throws(
        (function () {
          return function () {
            doc.createElement('div');
            sanitizeChildNodes(doc, {}, nodePropertyMap);
          };
        }()), /Need DOM Node interface/,
      );
    });
  });


  describe('join_siblings', () => {
    it('joins same-tag siblings of specified tags', () => {
      assert.equal(
        sanitizeHtml('<b>abc</b> <b>def</b> <i>jkl</i>', {
          join_siblings: ['B', 'I'],
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>abc def</b> <i>jkl</i>',
      );
    });

    it('joins same-tag siblings of specified tags and leaves children intact', () => {
      assert.equal(
        sanitizeHtml('<b>abc</b> <b>def <i>ghi</i></b><b>jkl</b>', {
          join_siblings: ['B', 'I'],
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>abc def <i>ghi</i>jkl</b>',
      );
    });


    it('does not join same-tag siblings when separated by non-whitespace text', () => {
      assert.equal(
        sanitizeHtml('<b>abc</b> x <b>def</b> <b>ghi <i>jkl</i></b><b>mno</b>', {
          join_siblings: ['B', 'I'],
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>abc</b> x <b>def ghi <i>jkl</i>mno</b>',
      );
    });
  });

  describe('allow_tags', () => {
    it('flattens all tags', () => {
      assert.equal(
        sanitizeHtml('<div><p>Hello <b class="klass">there</b></p></div>'),
        'Hello there',
      );
    });

    it('keeps all tags', () => {
      assert.equal(
        sanitizeHtml('<div><p>Hello <b>there</b></p></div>', {
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<div><p>Hello <b>there</b></p></div>',
      );
    });

    it('respects text nodes at top level', () => {
      assert.equal(
        sanitizeHtml('Blah blah blah<p>Whee!</p>', {
          allow_tags_direct: { '.*': '.*' },
        }),
        'Blah blah blah<p>Whee!</p>',
      );
    });


    describe('allow_tags_deep', () => {
      it('keeps only direct children of BODY', () => {
        assert.equal(
          sanitizeHtml('<i><b>abc</b></i><p>Paragraph <b>flat1</b> <i><b>flat2</b></i></p>', {
            allow_tags_direct: {
              BODY: '.*',
            },
          }),
          '<i>abc</i><p>Paragraph flat1 flat2</p>',
        );
      });

      it('keeps deep P and I children of BODY, and only direct B children of I', () => {
        assert.equal(
          sanitizeHtml('<i><b>abc</b></i><p>Paragraph <b>def</b> <i><b>ghi</b></i></p>', {
            allow_tags_deep: {
              BODY: ['P', 'I'],
            },
            allow_tags_direct: {
              I: ['B'],
            },
          }),
          '<i><b>abc</b></i><p>Paragraph def <i><b>ghi</b></i></p>',
        );
      });

      it('keeps only P, H1 and H2, specified by regexp', () => {
        assert.equal(
          sanitizeHtml('<h1>Heading1</h1><p><span>Para</span>graph</p><h2>Subheading</h2><p>Paragraph</p><h3>Subsubheading</h3>', {
            allow_tags_direct: {
              '.*': ['H[1-2]', 'P'],
            },
          }),
          '<h1>Heading1</h1><p>Paragraph</p><h2>Subheading</h2><p>Paragraph</p>Subsubheading',
        );
      });
    });


    describe('allow_tags_deep', () => {
      it('keeps only direct children of BODY, and deep B children of I', () => {
        assert.equal(
          sanitizeHtml('<i><b>keep</b></i><p>Paragraph <b>flat1</b> <i><u><b>keep</b></u></i></p>', {
            allow_tags_direct: {
              BODY: '.*',
            },
            allow_tags_deep: {
              '.*': ['U', 'I'],
              I: ['B'],
            },
          }),
          '<i><b>keep</b></i><p>Paragraph flat1 <i><u><b>keep</b></u></i></p>',
        );
      });

      it('keeps deep U and I, specified by regexp', () => {
        assert.equal(
          sanitizeHtml('<i><b>keep</b></i><p>Paragraph <b>flat1</b> <i><u><b>keep</b></u></i></p>', {
            allow_tags_deep: {
              '.*': ['(U|I)'],
            },
          }),
          '<i>keep</i>Paragraph flat1 <i><u>keep</u></i>',
        );
      });
    });
  });

  describe('flatten_tags', () => {
    it('gives flatten_tags_* precedence over allow_tags', () => {
      assert.equal(
        sanitizeHtml('<b>good</b><p>Paragraph <b>bad</b> <i><b>flat</b></i></p>', {
          flatten_tags_deep: {
            '.*': '.*',
          },
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        'goodParagraph bad flat',
      );
    });


    it('flattens B deeply nested in P', () => {
      assert.equal(
        sanitizeHtml('<b>keep</b><p>Paragraph <b>flat</b> <i><b>abc</b></i></p>', {
          flatten_tags_deep: {
            P: ['B'],
          },
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>keep</b><p>Paragraph flat <i>abc</i></p>',
      );
    });

    it('flattens direct B children of P', () => {
      assert.equal(
        sanitizeHtml('<b>keep</b><p>Paragraph <b>flat</b> <i><b>keep</b></i> <b>flat</b></p>', {
          flatten_tags_direct: {
            P: ['B'],
          },
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>keep</b><p>Paragraph flat <i><b>keep</b></i> flat</p>',
      );
    });

    it('flattens redundant B', () => {
      assert.equal(
        sanitizeHtml('<b>bold<i>italic<b>bolditalic</b></i></b>', {
          flatten_tags_deep: {
            B: ['B'],
          },
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>bold<i>italicbolditalic</i></b>',
      );
    });
  });


  describe('remove_tags', () => {
    it('removes direct B children of P', () => {
      assert.equal(
        sanitizeHtml('<b>keep</b><p>Paragraph <b>remove</b> <i><b>keep</b></i> <b>bold</b></p>', {
          remove_tags_direct: {
            P: ['B'],
          },
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>keep</b><p>Paragraph  <i><b>keep</b></i> </p>',
      );
    });

    it('removes deeply nested B children of P, and remove remaining empty I tag', () => {
      assert.equal(
        sanitizeHtml('<b>keep</b><p>Paragraph <b>remove</b> <i><b>remove</b></i> <b>bold</b></p>', {
          remove_empty: true,
          remove_tags_deep: {
            P: ['B'],
          },
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>keep</b><p>Paragraph   </p>',
      );
    });
  });


  describe('remove_empty', () => {
    it('removes empty nodes', () => {
      assert.equal(
        sanitizeHtml('<b></b>', {
          remove_empty: true,
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '',
      );
    });

    it('does not remove a node just containing another empty node', () => {
      // Here we need to create the DOM manually because jsdom doesn't seem to
      // parse the string '<b><i></i></b>' properly. It says that B has no
      // child nodes.

      container.innerHTML = '';
      const boldElement = doc.createElement('B');
      const italicElement = doc.createElement('I');
      const txtnd = doc.createTextNode('');
      italicElement.appendChild(txtnd);
      boldElement.appendChild(italicElement);
      container.appendChild(boldElement);

      sanitizeChildNodes(doc, container, nodePropertyMap, {
        remove_empty: true,
        allow_tags_direct: {
          '.*': '.*',
        },
      });

      assert.equal(container.innerHTML, '<b><i></i></b>');
    });
  });


  describe('filters', () => {
    it('replaces `o` characters with IMG tags, and replaces `l` characters with `L`, using two consecutive filters', () => {
      assert.equal(
        sanitizeHtml('Hello World', {
          allow_tags_direct: { '.*': '.*' },
          allow_attributes_by_tag: { '.*': ['.*'] },
          allow_url_schemes_by_tag: {
            IMG: ['https'],
          },
          filters_by_tag: {
            TEXT: [
              function replaceOWithImg(node) {
                const content = node.textContent;
                const elems = [];
                let match;
                let lastIndex = 0;
                let matchedAny;
                const regex = /o/g;

                while ((match = regex.exec(content))) {
                  const txtBefore = content.substring(lastIndex, match.index);
                  if (txtBefore) {
                    const tn1 = doc.createTextNode(txtBefore);
                    nodePropertyMap.set(tn1, { skip_filters: false });
                    elems.push(tn1);
                  }
                  // const emojichar = match[0];
                  const img = doc.createElement('IMG');
                  img.alt = 'o';
                  img.src = 'https://link/to/o.png';

                  elems.push(img);
                  lastIndex = regex.lastIndex;
                  matchedAny = true;
                }

                if (matchedAny) {
                  const rest = content.substring(lastIndex);
                  if (rest) {
                  // console.log('emoji rest', rest);
                    const tn2 = doc.createTextNode(rest);
                    nodePropertyMap.set(tn2, { skip_filters: false });
                    elems.push(tn2);
                  }
                  return elems;
                }
                return node;
              },
              function (node) {
                node.textContent = node.textContent.replace(/l/g, 'L');
                return node;
              },
            ],
          },
        }),
        'HeLL<img alt="o" src="https://link/to/o.png"> W<img alt="o" src="https://link/to/o.png">rLd',
      );
    });

    it('removes B tag', () => {
      assert.equal(
        sanitizeHtml('<p>Paragraph <i><b>remove</b></i></p>', {
          allow_tags_direct: {
            '.*': '.*',
          },
          filters_by_tag: {
            B: [function () {
              return null; // returning null will remove the node
            }],
          },
        }),
        '<p>Paragraph <i></i></p>',
      );
    });

    it('modifies B tag to have a different innerText', () => {
      assert.equal(
        sanitizeHtml('<p>Paragraph <i><b>bold</b></i></p>', {
          allow_tags_direct: {
            '.*': '.*',
          },
          filters_by_tag: {
            B: [
              function changesInnerHtml(node, { parentNodenames }) {
                node.innerHTML = parentNodenames.join(', ');
                return node;
              },
            ],
          },
        }),
        '<p>Paragraph <i><b>I, P, BODY</b></i></p>',
      );
    });

    it('changes B tag to EM tag', () => {
      assert.equal(
        sanitizeHtml('<p>Paragraph <i><b>bold</b></i></p>', {
          allow_tags_direct: {
            '.*': '.*',
          },
          filters_by_tag: {
            B: [
              function changesToEm() {
                const em = doc.createElement('em');
                em.innerHTML = 'changed';
                return em;
              },
            ],
          },
        }),
        '<p>Paragraph <i><em>changed</em></i></p>',
      );
    });

    it('changes B tag to EM tag, then modifies EM tag', () => {
      assert.equal(
        sanitizeHtml('<p>Paragraph <i><b>bold</b></i></p>', {
          allow_tags_direct: {
            '.*': '.*',
          },
          filters_by_tag: {
            B: [
              function changesToEm() {
                const em = doc.createElement('em');
                em.innerHTML = 'changed';
                return em;
              },
            ],
            EM: [
              function changesInnerHtml(node, { parentNodenames }) {
                node.innerHTML = parentNodenames.join('-');
                return node;
              },
            ],
          },
        }),
        '<p>Paragraph <i><em>I-P-BODY</em></i></p>',
      );
    });


    it("throws when a filter returns the same node type but doesn't set the property 'skip_filters'", () => {
      assert.throws(
        (function () {
          return function () {
            sanitizeHtml('<p>Paragraph</p>', {
              allow_tags_direct: {
                '.*': '.*',
              },
              filters_by_tag: {
                P: [
                  function wouldCreateInfiniteLoop() {
                    const par = doc.createElement('P');
                    par.innerHTML = 'txt';
                    return par;
                  },
                ],
              },
            });
          };
        }()),
        /Prevented possible infinite loop/,
      );
    });

    it('prevents an infinite loop by setting skip_filters', () => {
      assert.equal(
        sanitizeHtml('<p>Paragraph</p>', {
          allow_tags_direct: {
            '.*': '.*',
          },
          filters_by_tag: {
            P: [
              function replaceWithAnotherP() {
                const par = doc.createElement('P');
                par.innerHTML = 'txt';
                nodePropertyMap.set(par, { skip_filters: true });
                return par;
              },
            ],
          },
        }),
        '<p>txt</p>',
      );
    });


    it('skips later filters', () => {
      assert.equal(
        sanitizeHtml('<p><span class="precious">foo</span><span>foo</span></p>', {
          allow_tags_direct: {
            '.*': '.*',
          },
          filters_by_tag: {
            SPAN: [
              function maybeSkipLaterFilters(node) {
                if (node.className.includes('precious')) nodePropertyMap.set(node, { skip_filters: true });
                return node;
              },
              function replaceFooWithBar(node) {
                node.innerHTML = node.innerHTML.replace('foo', 'bar');
                return node;
              },
            ],
          },
        }),
        '<p><span>foo</span><span>bar</span></p>',
      );
    });

    it('skips filtering nodes with skip_filters property, set before sanitization', () => {
      container.innerHTML = '<p><span>foo</span><span>foo</span></p>';
      const firstspan = container.getElementsByTagName('span')[0];
      nodePropertyMap.set(firstspan, { skip_filters: true });

      sanitizeChildNodes(doc, container, nodePropertyMap, {
        allow_tags_direct: {
          '.*': '.*',
        },
        filters_by_tag: {
          SPAN: [
            function replaceFooWithBar(node) {
              node.innerHTML = node.innerHTML.replace('foo', 'bar');
              return node;
            },
          ],
        },
      });

      assert.equal(
        container.innerHTML,
        '<p><span>foo</span><span>bar</span></p>',
      );
    });

    it('removes skip_filters property', () => {
      container.innerHTML = '<p><span>foo</span><span>foo</span></p>';
      const firstspan = container.getElementsByTagName('span')[0];
      nodePropertyMap.set(firstspan, { skip_filters: true });

      sanitizeChildNodes(doc, container, nodePropertyMap, {
        allow_tags_direct: {
          '.*': '.*',
        },
        filters_by_tag: {
          SPAN: [
            function replaceFooWithBar(node) {
              node.innerHTML = node.innerHTML.replace('foo', 'bar');
              return node;
            },
          ],
        },
      });

      sanitizeChildNodes(doc, container, nodePropertyMap, {
        allow_tags_direct: {
          '.*': '.*',
        },
        filters_by_tag: {
          SPAN: [
            function replaceFooWithBar(node) {
              node.innerHTML = node.innerHTML.replace('foo', 'bar');
              return node;
            },
          ],
        },
      });

      assert.equal(
        container.innerHTML,
        '<p><span>bar</span><span>bar</span></p>',
      );
    });
  });


  describe('skip property', () => {
    it('skips all sanitization when `skip` property present, set before sanitization', () => {
      container.innerHTML = '<p><span>foo</span><span>foo</span></p>';
      const firstspan = container.getElementsByTagName('span')[0];
      nodePropertyMap.set(firstspan, { skip: true });

      sanitizeChildNodes(doc, container, nodePropertyMap, {
        allow_tags_direct: {
          '.*': ['P'],
        },
      });

      assert.equal(
        container.innerHTML,
        '<p><span>foo</span>foo</p>',
      );
    });

    it('removes `skip` property', () => {
      container.innerHTML = '<p><span>foo</span><span>foo</span></p>';
      const firstspan = container.getElementsByTagName('span')[0];
      nodePropertyMap.set(firstspan, { skip: true });

      sanitizeChildNodes(doc, container, nodePropertyMap, {
        allow_tags_direct: {
          '.*': ['P'],
        },
      });

      sanitizeChildNodes(doc, container, nodePropertyMap, {
        allow_tags_direct: {
          '.*': ['P'],
        },
      });

      assert.equal(
        container.innerHTML,
        '<p>foofoo</p>',
      );
    });
  });


  describe('allow_attributes_by_tag', () => {
    it('keeps all attributes', () => {
      assert.equal(
        sanitizeHtml('<div><wiggly worms="ewww">hello</wiggly></div>', {
          allow_tags_direct: { '.*': '.*' },
          allow_attributes_by_tag: { '.*': '.*' },
        }),
        '<div><wiggly worms="ewww">hello</wiggly></div>',
      );
    });

    it('keeps only allowed attributes, using regex', () => {
      assert.equal(
        sanitizeHtml('<div><wiggly worms="ewww" warm="false">hello</wiggly><span worms="eww">world</span></div>', {
          allow_tags_direct: { '.*': '.*' },
          allow_attributes_by_tag: { 'WIGG.*': 'w[oa]rms*' },
        }),
        '<div><wiggly worms="ewww" warm="false">hello</wiggly><span>world</span></div>',
      );
    });
  });

  describe('allow_classes_by_tag', () => {
    it('keeps all classes', () => {
      assert.equal(
        sanitizeHtml('<div class="one">txt</div>', {
          allow_tags_direct: { '.*': '.*' },
          allow_classes_by_tag: { '.*': '.*' },
        }),
        '<div class="one">txt</div>',
      );
    });

    it('keeps only allowed classes, using regex', () => {
      assert.equal(
        sanitizeHtml('<div class="one two three thirty"><span class="two twenty thirty">txt</span></div>', {
          allow_tags_direct: { '.*': '.*' },
          allow_attributes_by_tag: { '.*': '.*' },
          allow_classes_by_tag: {
            DIV: ['th.*'],
            SPAN: ['.*ty'],
          },
        }),
        '<div class="three thirty"><span class="twenty thirty">txt</span></div>',
      );
    });

    it('removes class attribute when no classes remaining', () => {
      assert.equal(
        sanitizeHtml('<div class="abc">txt</div>', {
          allow_tags_direct: { '.*': '.*' },
          allow_attributes_by_tag: { '.*': '.*' },
        }),
        '<div>txt</div>',
      );
    });
  });
}

export default runTests;
