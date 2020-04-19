import matchesAny from './matches-any.js';

function filterClassesForNode(node, allowClassesByTag) {
  const classes = [];
  for (let i = 0; i < node.classList.length; i += 1) {
    const kls = node.classList[i];
    classes.push(kls);
  }

  for (let i = 0; i < classes.length; i += 1) {
    const classname = classes[i];
    const keep = matchesAny(allowClassesByTag, node.nodeName, classname);
    if (!keep) node.classList.remove(classname);
  }

  if (node.hasAttribute('class') && node.classList.length === 0) {
    node.attributes.removeNamedItem('class');
  }
}

function filterAttributesForNode(node, allowAttributesByTag) {
  const { attributes } = node;
  const attributeCount = attributes.length;
  const attributeNames = [];
  for (let i = 0; i < attributeCount; i += 1) attributeNames.push(attributes[i].name);

  attributeNames.forEach((attname) => {
    if (
      attname !== 'class' // classes are filtered separately
      && ! matchesAny(allowAttributesByTag, node.nodeName, attname)
    ) {
      attributes.removeNamedItem(attname);
    }
  });
}

export { filterAttributesForNode, filterClassesForNode };
