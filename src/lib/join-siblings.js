import childrenSnapshot from './children-snapshot.js';

function joinSiblings(parentNode, joinableTags) {
  const siblings = childrenSnapshot(parentNode);

  for (let i = 0; i < siblings.length; i += 1) {
    const node = siblings[i];
    const neighbour1 = siblings[i + 1];
    const neighbour2 = siblings[i + 2];

    if (!neighbour1) continue;
    if (!joinableTags.includes(node.nodeName)) continue;

    let joined = false;
    if (node.nodeName === neighbour1.nodeName) {
      const children = childrenSnapshot(neighbour1);
      for (let j = 0; j < children.length; j += 1) node.appendChild(children[j]);
      neighbour1.remove();
      joined = true;

    } else if ( // Look ahead and join when there is just white space in between two nodes.
      neighbour2
      && node.nodeName === neighbour2.nodeName
      && neighbour1.nodeType === 3
      && neighbour1.textContent.match(/^\s+$/)
    ) {
      node.appendChild(neighbour1);

      const children = childrenSnapshot(neighbour2);
      for (let j = 0; j < children.length; j += 1) node.appendChild(children[j]);
      neighbour2.remove();
      joined = true;
    }

    // Depending on the tags of the now joined child nodes of the first sibling, we still may
    // end up with two identical tags next to each other. We have to re-start from beginning
    // until nothing more is joinable.
    if (joined) joinSiblings(parentNode, joinableTags);
  }
}

export default joinSiblings;
