/* eslint-disable prefer-arrow-callback, func-names */
/* eslint no-param-reassign: ["error", { "props": true, "ignorePropertyModificationsFor": ["node", "container"] }] */

import assert from 'assert';

import { sanitizeNode, sanitizeChildNodes, sanitizeHtml } from '../src/index.js';

function runTests(doc, container) {

  const nodePropertyMap = new WeakMap();

  function run(html, opts = {}) {
    return sanitizeHtml(doc, html, opts, false, nodePropertyMap);
  }

  describe('initialization', () => {
    it('throws when no DOM API passed in', () => {
      assert.throws(
        (function () {
          return function () {
            const node = doc.createElement('div');
            sanitizeChildNodes({}, node);
          };
        }()), /Need DOM Document interface/,
      );
    });

    it('throws when node of wrong interface passed in', () => {
      assert.throws(
        (function () {
          return function () {
            doc.createElement('div');
            sanitizeChildNodes(doc, {});
          };
        }()), /Need DOM Node interface/,
      );
    });
  });

  specify('sanitizeNode works', () => {
    const par = doc.createElement('P');
    const span = doc.createElement('SPAN');
    par.appendChild(span);
    span.innerHTML = 'abc';

    sanitizeNode(doc, par, {
      allow_tags_direct: {
        '.*': '^P',
      },
    });

    assert.equal(par.outerHTML, '<p>abc</p>');
  });

  it('can work with documents (with the HTML level)', () => {
    const html = '<html><head><script>console.log("hi");</script></head><body>hello</body></html>';
    assert.equal(
      sanitizeHtml(doc, html, {
        allow_tags_direct: {
          '.*': '.*',
        },
      }, true),
      html,
    );
  });

  specify('the context node for non-document HTML is BODY', () => {
    assert.equal(
      run('<b>abc</b>', {
        allow_tags_direct: {
          body: 'b',
        },
      }),
      '<b>abc</b>',
    );
  });

  describe('join_siblings', () => {
    it('joins same-tag siblings of specified tags, keeping children intact', () => {
      assert.equal(
        run('<b>abc</b> <b>def <u>ghi</u></b> <i>jkl</i> <i>mno</i>', {
          join_siblings: ['B'],
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>abc def <u>ghi</u></b> <i>jkl</i> <i>mno</i>',
      );
    });

    it('joins same-tag siblings when separated by whitespace', () => {
      assert.equal(
        run('<b>abc</b> <b>def</b> <b>ghi</b>', {
          join_siblings: ['B', 'I'],
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>abc def ghi</b>',
      );
    });

    it('joins same-tag siblings when not separated by whitespace', () => {
      assert.equal(
        run('<b>abc</b><b>def</b><b>ghi</b>', {
          join_siblings: ['B', 'I'],
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>abcdefghi</b>',
      );
    });

    it('does not join same-tag siblings when separated by non-whitespace text', () => {
      assert.equal(
        run('<b>abc</b> x <b>def</b>', {
          join_siblings: ['B', 'I'],
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>abc</b> x <b>def</b>',
      );
    });
  });

  it('flattens all tags by default', () => {
    assert.equal(
      run('<div><p>abc <b class="klass">def</b></p></div>'),
      'abc def',
    );
  });

  describe('allow_tags', () => {
    it('keeps all tags using wildcard tag specifiers', () => {
      assert.equal(
        run('<div><p>abc <b>def</b></p></div>', {
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<div><p>abc <b>def</b></p></div>',
      );
    });

    it('respects text nodes at top level', () => {
      assert.equal(
        run('abc <p>def</p>', {
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        'abc <p>def</p>',
      );
    });


    describe('allow_tags_direct', () => {
      it('keeps only direct children of BODY', () => {
        assert.equal(
          run('<i><b>abc</b></i> <p>def <b>ghi</b> <i><b>jkl</b></i></p>', {
            allow_tags_direct: {
              BODY: '.*',
            },
          }),
          '<i>abc</i> <p>def ghi jkl</p>',
        );
      });

      it('keeps I and direct B children of I', () => {
        assert.equal(
          run('<i><b>abc</b></i><p>def <b>ghi</b> <i><b>jkl</b></i></p>', {
            allow_tags_direct: {
              '.*': 'I',
              I: 'B',
            },
          }),
          '<i><b>abc</b></i>def ghi <i><b>jkl</b></i>',
        );
      });

      it('keeps only P, H1 and H2, specified by regexp', () => {
        assert.equal(
          run('<h1>abc</h1><p><span>def</span>ghi</p><h2>jkl</h2><p>mno</p><h3>pqr</h3>', {
            allow_tags_direct: {
              '.*': ['H[1-2]', '^P'],
            },
          }),
          '<h1>abc</h1><p>defghi</p><h2>jkl</h2><p>mno</p>pqr',
        );
      });
    });


    describe('allow_tags_deep', () => {
      it('keeps P and its B and U descendants', () => {
        assert.equal(
          run('<i><u>abc</u></i> <p>def <i><b>ghi</b> <u>jkl</u></i></p>', {
            allow_tags_deep: {
              '.*': 'P',
              P: ['B', 'U'],
            },
          }),
          'abc <p>def <b>ghi</b> <u>jkl</u></p>',
        );
      });

      it('keeps deep U and I, specified by regexp', () => {
        assert.equal(
          run('<i>abc</i> <b>def</b>', {
            allow_tags_deep: {
              '.*': '(I|B)',
            },
          }),
          '<i>abc</i> <b>def</b>',
        );
      });
    });
  });

  describe('flatten_tags', () => {
    it('gives flatten_tags_* precedence over allow_tags', () => {
      assert.equal(
        run('<b>abc</b> <p>def <b>ghi</b> <i><b>jkl</b></i></p>', {
          flatten_tags_deep: {
            '.*': '.*',
          },
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        'abc def ghi jkl',
      );
    });

    it('flattens direct B children of P', () => {
      assert.equal(
        run('<b>abc</b><p>def <b>ghi</b> <i><b>jkl</b></i> <b>mno</b></p>', {
          flatten_tags_direct: {
            P: ['B'],
          },
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>abc</b><p>def ghi <i><b>jkl</b></i> mno</p>',
      );
    });

    it('flattens redundant B', () => {
      assert.equal(
        run('<b>abc <i>def <b>ghi</b></i></b>', {
          flatten_tags_deep: {
            '^B$': ['B'],
          },
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>abc <i>def ghi</i></b>',
      );
    });
  });


  describe('remove_tags', () => {
    it('removes everything except U and keeps its text', () => {
      assert.equal(
        run('<i>abc</i><u>def</u><b>ghi</b>', {
          remove_tags_deep: {
            '.*': '[^u]',
          },
        }),
        'def',
      );
    });

    it('removes direct B children of P', () => {
      assert.equal(
        run('<b>abc</b> <p>def <b>ghi</b> <i><b>jkl</b></i> <b>mno</b></p>', {
          remove_tags_direct: {
            P: ['B'],
          },
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>abc</b> <p>def  <i><b>jkl</b></i> </p>',
      );
    });

    it('removes deeply nested B children of P, and remove remaining empty I tag', () => {
      assert.equal(
        run('<b>abc</b> <p>def <b>ghi</b> <i><b>jkl</b></i> <b>mno</b></p>', {
          remove_empty: true,
          remove_tags_deep: {
            P: ['B'],
          },
          allow_tags_direct: {
            '.*': '.*',
          },
        }),
        '<b>abc</b> <p>def   </p>',
      );
    });
  });


  describe('remove_empty', () => {
    it('removes empty nodes', () => {
      assert.equal(
        run('<b></b>', {
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

      sanitizeChildNodes(doc, container, {
        remove_empty: true,
        allow_tags_direct: {
          '.*': '.*',
        },
      }, nodePropertyMap);

      assert.equal(container.innerHTML, '<b><i></i></b>');
    });
  });


  describe('filters', () => {
    it('replaces `o` characters with IMG tags, and replaces `l` characters with `L`, using two consecutive filters', () => {
      assert.equal(
        run('Hello World', {
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

    it('passes a list of parents to the filter', () => {
      run('<p>abc <i><b>def</b></i></p>', {
        allow_tags_direct: {
          '.*': '.*',
        },
        filters_by_tag: {
          B: [function (node, { parents }) {
            assert.equal(parents[0].nodeName, 'I');
            assert.equal(parents[1].nodeName, 'P');
          }],
        },
      });
    });

    it('passes the current sibling index to the filter', () => {
      run('<p><b>abc</b><i>def</i><u>jkl</u></p>', {
        allow_tags_direct: {
          '.*': '.*',
        },
        filters_by_tag: {
          B: [function (node, { siblingIndex }) {
            assert.equal(siblingIndex, 0);
          }],
          I: [function (node, { siblingIndex }) {
            assert.equal(siblingIndex, 1);
          }],
          U: [function (node, { siblingIndex }) {
            assert.equal(siblingIndex, 2);
          }],
        },
      });
    });

    it('removes B tag', () => {
      assert.equal(
        run('<p>abc <i><b>def</b></i></p>', {
          allow_tags_direct: {
            '.*': '.*',
          },
          filters_by_tag: {
            B: [function () {
              return null; // returning null will remove the node
            }],
          },
        }),
        '<p>abc <i></i></p>',
      );
    });

    it('modifies B tag to have a different innerText', () => {
      assert.equal(
        run('<p>abc <i><b>def</b></i></p>', {
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
        '<p>abc <i><b>I, P, BODY</b></i></p>',
      );
    });

    it('changes B tag to EM tag', () => {
      assert.equal(
        run('<p>abc <i><b>def</b></i></p>', {
          allow_tags_direct: {
            '.*': '.*',
          },
          filters_by_tag: {
            B: [
              function changesToEm() {
                const em = doc.createElement('em');
                em.innerHTML = 'ghi';
                return em;
              },
            ],
          },
        }),
        '<p>abc <i><em>ghi</em></i></p>',
      );
    });

    it('changes B tag to EM tag, then modifies EM tag', () => {
      assert.equal(
        run('<p>abc <i><b>def</b></i></p>', {
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
        '<p>abc <i><em>I-P-BODY</em></i></p>',
      );
    });


    it("throws when a filter returns the same node type but doesn't set the property 'skip_filters'", () => {
      assert.throws(
        (function () {
          return function () {
            run('<p>Paragraph</p>', {
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
        run('<p>Paragraph</p>', {
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
        run('<p><span class="a">foo</span><span>abc</span></p>', {
          allow_tags_direct: {
            '.*': '.*',
          },
          filters_by_tag: {
            SPAN: [
              function maybeSkipLaterFilters(node) {
                if (node.className.includes('a')) nodePropertyMap.set(node, { skip_filters: true });
                return node;
              },
              function replaceFooWithBar(node) {
                node.innerHTML = node.innerHTML.replace('foo', 'bar');
                return node;
              },
            ],
          },
        }),
        '<p><span>foo</span><span>abc</span></p>',
      );
    });

    it('skips filtering nodes with skip_filters property, set before processing', () => {
      container.innerHTML = '<p><span>foo</span><span>foo</span></p>';
      const firstspan = container.getElementsByTagName('span')[0];
      nodePropertyMap.set(firstspan, { skip_filters: true });

      sanitizeChildNodes(doc, container, {
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
      }, nodePropertyMap);

      assert.equal(
        container.innerHTML,
        '<p><span>foo</span><span>bar</span></p>',
      );
    });

    it('removes skip_filters property', () => {
      container.innerHTML = '<p><span>foo</span><span>foo</span></p>';
      const firstspan = container.getElementsByTagName('span')[0];
      nodePropertyMap.set(firstspan, { skip_filters: true });

      sanitizeChildNodes(doc, container, {
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
      }, nodePropertyMap);

      sanitizeChildNodes(doc, container, {
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
      }, nodePropertyMap);

      assert.equal(
        container.innerHTML,
        '<p><span>bar</span><span>bar</span></p>',
      );
    });
  });


  describe('skip property', () => {
    it('skips sanitization when `skip` property present, then removes `skip` property', () => {
      container.innerHTML = '<p><span>foo</span><span>foo</span></p>';
      const firstspan = container.getElementsByTagName('span')[0];
      nodePropertyMap.set(firstspan, { skip: true });

      sanitizeChildNodes(doc, container, {
        allow_tags_direct: {
          '.*': ['^P'],
        },
      }, nodePropertyMap);

      assert.equal(
        container.innerHTML,
        '<p><span>foo</span>foo</p>',
      );

      sanitizeChildNodes(doc, container, {
        allow_tags_direct: {
          '.*': ['^P'],
        },
      }, nodePropertyMap);

      assert.equal(
        container.innerHTML,
        '<p>foofoo</p>',
      );
    });
  });


  describe('allow_attributes_by_tag', () => {
    it('keeps all attributes', () => {
      assert.equal(
        run('<div><span abc="def">ghi</span></div>', {
          allow_tags_direct: { '.*': '.*' },
          allow_attributes_by_tag: { '.*': '.*' },
        }),
        '<div><span abc="def">ghi</span></div>',
      );
    });

    it('keeps only allowed attributes, using regex', () => {
      assert.equal(
        run('<div><span hello="abc" hi="def" ghi="jkl">mno</span></div>', {
          allow_tags_direct: { '.*': '.*' },
          allow_attributes_by_tag: { '^s.*': '^h.*' },
        }),
        '<div><span hello="abc" hi="def">mno</span></div>',
      );
    });

    it('removes all attributes', () => {
      assert.equal(
        run('<div aaa="1" bbb="2"></div>', {
          allow_tags_direct: { '.*': '.*' },
        }),
        '<div></div>',
      );
    });
  });

  describe('allow_classes_by_tag', () => {
    it('keeps all classes', () => {
      assert.equal(
        run('<div class="one">txt</div>', {
          allow_tags_direct: { '.*': '.*' },
          allow_classes_by_tag: { '.*': '.*' },
        }),
        '<div class="one">txt</div>',
      );
    });

    it('keeps only allowed classes, using regex', () => {
      assert.equal(
        run('<div class="one two three thirty"><span class="two twenty thirty">txt</span></div>', {
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
        run('<div class="abc">txt</div>', {
          allow_tags_direct: { '.*': '.*' },
          allow_attributes_by_tag: { '.*': '.*' },
        }),
        '<div>txt</div>',
      );
    });
  });
}

export default runTests;
