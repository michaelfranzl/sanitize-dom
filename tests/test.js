/*jshint esversion: 6 */

const {sanitizeNode, sanitizeChildNodes} = require('../src/index.js');

const assert = require('assert');

const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const dom = new JSDOM();
const doc = dom.window.document;


const sanitizeHtml = function(html, opts = {}) {
  doc.body.innerHTML = html;
  sanitizeChildNodes(doc, doc.body, opts);
  return doc.body.innerHTML;
};


describe('initialization', function() {
  
  it('throws when no DOM API passed in', function() {
    assert.throws(
      function() {
        return function() {
          let node = doc.createElement('div');
          sanitizeChildNodes({}, node);
        };
      }(), /Need DOM Document interface/);
  });
  
  it('throws when no node passed in', function() {
    assert.throws(
      function() {
        return function() {
          let node = doc.createElement('div');
          sanitizeChildNodes(doc, {});
        };
      }(), /Need DOM Node interface/);
  });
  
});

describe('join_siblings', function() {
  
  it('joins same-tag siblings of specified tags', function() {
    assert.equal(
      sanitizeHtml('<b>abc</b> <b>def</b> <i>jkl</i>', {
        join_siblings: ['B', 'I'],
        allow_tags_direct: {
          '.*': '.*',
        }
      }),
      '<b>abc def</b> <i>jkl</i>'
    );
  });
  
  it('joins same-tag siblings of specified tags and leaves children intact', function() {
    assert.equal(
      sanitizeHtml('<b>abc</b> <b>def <i>ghi</i></b><b>jkl</b>', {
        join_siblings: ['B', 'I'],
        allow_tags_direct: {
          '.*': '.*',
        }
      }),
      '<b>abc def <i>ghi</i>jkl</b>'
    );
  });
  
  
  it('does not join same-tag siblings when separated by non-whitespace text', function() {
    assert.equal(
      sanitizeHtml('<b>abc</b> x <b>def</b> <b>ghi <i>jkl</i></b><b>mno</b>', {
        join_siblings: ['B', 'I'],
        allow_tags_direct: {
          '.*': '.*',
        }
      }),
      '<b>abc</b> x <b>def ghi <i>jkl</i>mno</b>'
    );
  });
});

describe('allow_tags', function() {
  
  it('flattens all tags', function() {
    assert.equal(
      sanitizeHtml('<div><p>Hello <b class="klass">there</b></p></div>'),
      'Hello there'
    );
  });

  it('keeps all tags', function() {
    assert.equal(
      sanitizeHtml('<div><p>Hello <b>there</b></p></div>', {
        allow_tags_direct: {
          '.*': '.*',
        }
      }),
      '<div><p>Hello <b>there</b></p></div>'
    );
  });

  it('respects text nodes at top level', function() {
    assert.equal(
      sanitizeHtml('Blah blah blah<p>Whee!</p>', {
        allow_tags_direct: { '.*': '.*' },
      }),
      'Blah blah blah<p>Whee!</p>'
    );
  });
  
  
  
  describe('allow_tags_deep', function() {
  
    it('keeps only direct children of BODY', function() {
      assert.equal(
        sanitizeHtml('<i><b>abc</b></i><p>Paragraph <b>flat1</b> <i><b>flat2</b></i></p>', {
          allow_tags_direct: {
            'BODY': '.*',
          },
        }),
        '<i>abc</i><p>Paragraph flat1 flat2</p>'
      );
    });

    it('keeps deep P and I children of BODY, and only direct B children of I', function() {
      assert.equal(
        sanitizeHtml('<i><b>abc</b></i><p>Paragraph <b>def</b> <i><b>ghi</b></i></p>', {
          allow_tags_deep: {
            'BODY': ['P', 'I'],
          },
          allow_tags_direct: {
            'I': ['B'],
          },
        }),
        '<i><b>abc</b></i><p>Paragraph def <i><b>ghi</b></i></p>'
      );
    });
    
    it('keeps only P, H1 and H2, specified by regexp', function() {
      assert.equal(
        sanitizeHtml('<h1>Heading1</h1><p><span>Para</span>graph</p><h2>Subheading</h2><p>Paragraph</p><h3>Subsubheading</h3>', {
          allow_tags_direct: {
            '.*': ['H[1-2]', 'P'],
          },
        }),
        '<h1>Heading1</h1><p>Paragraph</p><h2>Subheading</h2><p>Paragraph</p>Subsubheading'
      );
    });
    
  });
  
  
  describe('allow_tags_deep', function() {
    it('keeps only direct children of BODY, and deep B children of I', function() {
      assert.equal(
        sanitizeHtml('<i><b>keep</b></i><p>Paragraph <b>flat1</b> <i><u><b>keep</b></u></i></p>', {
          allow_tags_direct: {
            'BODY': '.*',
          },
          allow_tags_deep: {
            '.*': ['U', 'I'],
            'I': ['B'],
          },
        }),
        '<i><b>keep</b></i><p>Paragraph flat1 <i><u><b>keep</b></u></i></p>'
      );
    });
    
    it('keeps deep U and I, specified by regexp', function() {
      assert.equal(
        sanitizeHtml('<i><b>keep</b></i><p>Paragraph <b>flat1</b> <i><u><b>keep</b></u></i></p>', {
          allow_tags_deep: {
            '.*': ['(U|I)'],
          },
        }),
        '<i>keep</i>Paragraph flat1 <i><u>keep</u></i>'
      );
    });
  });
    
  

});


describe('flatten_tags', function() {
  
  it('gives flatten_tags_* precedence over allow_tags', function() {
    assert.equal(
      sanitizeHtml('<b>good</b><p>Paragraph <b>bad</b> <i><b>flat</b></i></p>', {
        flatten_tags_deep: {
          '.*': '.*',
        },
        allow_tags_direct: {
          '.*': '.*',
        },
      }),
      'goodParagraph bad flat'
    );
  });


  it('flattens B deeply nested in P', function() {
    assert.equal(
      sanitizeHtml('<b>keep</b><p>Paragraph <b>flat</b> <i><b>abc</b></i></p>', {
        flatten_tags_deep: {
          'P': ['B'],
        },
        allow_tags_direct: {
          '.*': '.*',
        },
      }),
      '<b>keep</b><p>Paragraph flat <i>abc</i></p>'
    );
  });
  
  it('flattens direct B children of P', function() {
    assert.equal(
      sanitizeHtml('<b>keep</b><p>Paragraph <b>flat</b> <i><b>keep</b></i> <b>flat</b></p>', {
        flatten_tags_direct: {
          'P': ['B'],
        },
        allow_tags_direct: {
          '.*': '.*',
        },
      }),
      '<b>keep</b><p>Paragraph flat <i><b>keep</b></i> flat</p>'
    );
  });
  
  it('flattens redundant B', function() {
    assert.equal(
      sanitizeHtml('<b>bold<i>italic<b>bolditalic</b></i></b>', {
        flatten_tags_deep: {
          'B': ['B'],
        },
        allow_tags_direct: {
          '.*': '.*',
        },
      }),
      '<b>bold<i>italicbolditalic</i></b>'
    );
  });
  
  
});


describe('remove_tags', function() {
  it('removes direct B children of P', function() {
    assert.equal(
      sanitizeHtml('<b>keep</b><p>Paragraph <b>remove</b> <i><b>keep</b></i> <b>bold</b></p>', {
        remove_tags_direct: {
          'P': ['B'],
        },
        allow_tags_direct: {
          '.*': '.*',
        },
      }),
      '<b>keep</b><p>Paragraph  <i><b>keep</b></i> </p>'
    );
  });
  
  it('removes deeply nested B children of P, and remove remaining empty I tag', function() {
    assert.equal(
      sanitizeHtml('<b>keep</b><p>Paragraph <b>remove</b> <i><b>remove</b></i> <b>bold</b></p>', {
        remove_empty: true,
        remove_tags_deep: {
          'P': ['B'],
        },
        allow_tags_direct: {
          '.*': '.*',
        },
      }),
      '<b>keep</b><p>Paragraph   </p>'
    );
  });
});



describe('remove_empty', function() {
  it('removes empty nodes', function() {
    assert.equal(
      sanitizeHtml('<b><b></b></b><b>  </b><b> \n</b><b> \t\r</b>', {
        remove_empty: true,
        allow_tags_direct: {
          '.*': '.*',
        },
      }),
      ''
    );
  });
});



describe('filters', function() {
  
  it('replaces `o` characters with IMG tags, and replaces `l` characters with `L`, using two consecutive filters', function() {
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
              let content = node.textContent;
              let match;
              let elems = [];
              let last_index = 0;
              let matched_any;
              let regex = /o/g;

              while ((match = regex.exec(content))) {
                let txt_before = content.substring(last_index, match.index);
                if (txt_before) {
                  let tn1 = doc.createTextNode(txt_before);
                  tn1.sanitize_skip_filters = false;
                  elems.push(tn1);
                }
                let emojichar = match[0];
                let img = doc.createElement('IMG');
                img.alt = 'o';
                img.src = 'https://link/to/o.png';
               
                elems.push(img);
                last_index = regex.lastIndex;
                matched_any = true;
              }

              if (matched_any) {
               let rest = content.substring(last_index);
               if (rest) {
                //console.log('emoji rest', rest);
                let tn2 = doc.createTextNode(rest);
                tn2.sanitize_skip_filters = false;
                elems.push(tn2);
              }
              return elems;
              
             } else {
               return node;
             }
           },
           function(node) {
             node.textContent = node.textContent.replace(/l/g, 'L');
             return node;
           },
          ]
        }
      }),
      'HeLL<img alt="o" src="https://link/to/o.png"> W<img alt="o" src="https://link/to/o.png">rLd'
    );
  });
  
  it('removes B tag', function() {
    assert.equal(
      sanitizeHtml('<p>Paragraph <i><b>remove</b></i></p>', {
        allow_tags_direct: {
          '.*': '.*',
        },
        filters_by_tag: {
         'B': [function(node, parents, parent_tagnames) {
           return null; // returning null will remove the node
         }]
        }
      }),
      '<p>Paragraph <i></i></p>'
    );
  });
  
  it('modifies B tag to have a different innerText', function() {
    assert.equal(
      sanitizeHtml('<p>Paragraph <i><b>bold</b></i></p>', {
        allow_tags_direct: {
          '.*': '.*',
        },
        filters_by_tag: {
          B: [
            function changesInnerHtml(node, parents, parent_tagnames) {
              node.innerHTML = parent_tagnames.join(", ");
              return node;
            }
          ]
        }
      }),
      '<p>Paragraph <i><b>I, P, BODY</b></i></p>'
    );
  });
  
  it('changes B tag to EM tag', function() {
    assert.equal(
      sanitizeHtml('<p>Paragraph <i><b>bold</b></i></p>', {
        allow_tags_direct: {
          '.*': '.*',
        },
        filters_by_tag: {
          B: [
            function changesToEm(node, parents, parent_tagnames) {
              let em = doc.createElement('em');
              em.innerHTML = 'changed';
              return em;
            }
         ],
        }
      }),
      '<p>Paragraph <i><em>changed</em></i></p>'
    );
  });
  
  it('changes B tag to EM tag, then modifies EM tag', function() {
    assert.equal(
      sanitizeHtml('<p>Paragraph <i><b>bold</b></i></p>', {
        allow_tags_direct: {
          '.*': '.*',
        },
        filters_by_tag: {
          B: [
            function changesToEm(node, parents, parent_tagnames) {
              let em = doc.createElement('em');
              em.innerHTML = 'changed';
              return em;
           }
         ],
          EM: [
            function changesInnerHtml(node, parents, parent_tagnames) {
              node.innerHTML = parent_tagnames.join('-');
              return node;
           }
         ],
        }
      }),
      '<p>Paragraph <i><em>I-P-BODY</em></i></p>'
    );
  });
  
  
  it("throws when a filter returns the same node type but doesn't set the property 'sanitize_skip_filters'" , function() {
    assert.throws(
      function() {
        return function() {
          sanitizeHtml('<p>Paragraph</p>', {
            allow_tags_direct: {
              '.*': '.*',
            },
            filters_by_tag: {
              P: [
                function wouldCreateInfiniteLoop(node, parents, parent_tagnames) {
                  let par = doc.createElement('P');
                  par.innerHTML = "txt";
                  return par;
                }
              ]
            }
          });
        };
      }(),
      /Prevented possible infinite loop/);
  });
  
  it("prevents an infinite loop by setting sanitize_skip_filters'" , function() {
    assert.equal(
      sanitizeHtml('<p>Paragraph</p>', {
        allow_tags_direct: {
          '.*': '.*',
        },
        filters_by_tag: {
          P: [
            function replaceWithAnotherP(node, parents, parent_tagnames) {
              let par = doc.createElement('P');
              par.innerHTML = "txt";
              par.sanitize_skip_filters = true;
              return par;
            }
          ]
        }
      }),
      '<p>txt</p>'
    );
  });
  
  
  it('skips later filters', function() {
    assert.equal(
      sanitizeHtml('<p><span class="precious">foo</span><span>foo</span></p>', {
        allow_tags_direct: {
          '.*': '.*',
        },
        filters_by_tag: {
          SPAN: [
            function maybeSkipLaterFilters(node) {
              if (node.className.includes('precious')) {
                node.sanitize_skip_filters = true;
              }
              return node;
            },
            function replaceFooWithBar(node, parents, parent_tagnames) {
              node.innerHTML = node.innerHTML.replace('foo', 'bar');
              return node;
            }
          ]
        }
      }),
      '<p><span>foo</span><span>bar</span></p>'
    );
  });
  
  it('skips filtering nodes with sanitize_skip_filters property, set before sanitization', function() {
    doc.body.innerHTML = '<p><span>foo</span><span>foo</span></p>';
    let firstspan = doc.body.getElementsByTagName('span')[0];
    firstspan.sanitize_skip_filters = true;
    
    sanitizeChildNodes(doc, doc.body, {
      allow_tags_direct: {
        '.*': '.*',
      },
      filters_by_tag: {
        SPAN: [
          function replaceFooWithBar(node, parents, parent_tagnames) {
            node.innerHTML = node.innerHTML.replace('foo', 'bar');
            return node;
          }
        ]
      }
    });
    
    assert.equal(
      doc.body.innerHTML,
      '<p><span>foo</span><span>bar</span></p>'
    );
  });
  
  it('removes sanitize_skip_filters property', function() {
    doc.body.innerHTML = '<p><span>foo</span><span>foo</span></p>';
    let firstspan = doc.body.getElementsByTagName('span')[0];
    firstspan.sanitize_skip_filters = true;
    
    sanitizeChildNodes(doc, doc.body, {
      allow_tags_direct: {
        '.*': '.*',
      },
      filters_by_tag: {
        SPAN: [
          function replaceFooWithBar(node, parents, parent_tagnames) {
            node.innerHTML = node.innerHTML.replace('foo', 'bar');
            return node;
          }
        ]
      }
    });
    
    sanitizeChildNodes(doc, doc.body, {
      allow_tags_direct: {
        '.*': '.*',
      },
      filters_by_tag: {
        SPAN: [
          function replaceFooWithBar(node, parents, parent_tagnames) {
            node.innerHTML = node.innerHTML.replace('foo', 'bar');
            return node;
          }
        ]
      }
    });
    
    assert.equal(
      doc.body.innerHTML,
      '<p><span>bar</span><span>bar</span></p>'
    );
  });
  
});
  
  
describe('sanitize_skip property', function() {
  
  it('skips all sanitization when `sanitize_skip` property present, set before sanitization', function() {
    doc.body.innerHTML = '<p><span>foo</span><span>foo</span></p>';
    let firstspan = doc.body.getElementsByTagName('span')[0];
    firstspan.sanitize_skip = true;
    
    sanitizeChildNodes(doc, doc.body, {
      allow_tags_direct: {
        '.*': ['P'],
      },
    });
    
    assert.equal(
      doc.body.innerHTML,
      '<p><span>foo</span>foo</p>'
    );
  });
  
  it('removes `sanitize_skip` property', function() {
    doc.body.innerHTML = '<p><span>foo</span><span>foo</span></p>';
    let firstspan = doc.body.getElementsByTagName('span')[0];
    firstspan.sanitize_skip = true;
    
    sanitizeChildNodes(doc, doc.body, {
      allow_tags_direct: {
        '.*': ['P'],
      },
    });
    
    sanitizeChildNodes(doc, doc.body, {
      allow_tags_direct: {
        '.*': ['P'],
      },
    });
    
    assert.equal(
      doc.body.innerHTML,
      '<p>foofoo</p>'
    );
  });
  
  
});



describe('allow_attributes_by_tag', function() {
  
  it('keeps all attributes', function() {
    assert.equal(
      sanitizeHtml('<div><wiggly worms="ewww">hello</wiggly></div>', {
        allow_tags_direct: { '.*': '.*' },
        allow_attributes_by_tag: { '.*': '.*' }
      }),
      '<div><wiggly worms="ewww">hello</wiggly></div>'
    );
  });
  
  it('keeps only allowed attributes, using regex', function() {
    assert.equal(
      sanitizeHtml('<div><wiggly worms="ewww" warm="false">hello</wiggly><span worms="eww">world</span></div>', {
        allow_tags_direct: { '.*': '.*' },
        allow_attributes_by_tag: { 'WIGG.*': 'w[oa]rms*' }
      }),
      '<div><wiggly worms="ewww" warm="false">hello</wiggly><span>world</span></div>'
    );
  });
  
});

describe('allow_classes_by_tag', function() {
  
  it('keeps all classes', function() {
    assert.equal(
      sanitizeHtml('<div class="one">txt</div>', {
        allow_tags_direct: { '.*': '.*' },
        allow_classes_by_tag: { '.*': '.*' }
      }),
      '<div>txt</div>'
    );
  });
  
  it('keeps only allowed classes, using regex', function() {
    assert.equal(
      sanitizeHtml('<div class="one two three thirty"><span class="two twenty thirty">txt</span></div>', {
        allow_tags_direct: { '.*': '.*' },
        allow_attributes_by_tag: { '.*': '.*' },
        allow_classes_by_tag: {
          'DIV': ['th.*'],
          'SPAN': ['.*ty']
        }
      }),
      '<div class="three thirty"><span class="twenty thirty">txt</span></div>'
    );
  });
  
  it('removes class attribute when no classes remaining', function() {
    assert.equal(
      sanitizeHtml('<div class="abc">txt</div>', {
        allow_tags_direct: { '.*': '.*' },
        allow_attributes_by_tag: { '.*': '.*' },
      }),
      '<div>txt</div>'
    );
  });
  
});