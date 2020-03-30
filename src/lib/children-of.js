/**
 * @param {DomNode} node
 * @return {Array} The children of the node. The array does not mutate when the underlying DOM
 * changes (as for example `node.childNodes()` does), so it can be safely iterated.
 */
function childrenOf(node) {
  const children = [];
  for (let i = 0; i < node.childNodes.length; i += 1) {
    const child = node.childNodes[i];
    children.push(child);
  }
  return children;
}

export default childrenOf;
