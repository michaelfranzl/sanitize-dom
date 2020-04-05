/**
 * @param {Map} valuesByTagRegex
 * @param {string} tagname
*/
function getValuesForTagname(valuesByTagRegex, tagname) {
  let values = [];
  valuesByTagRegex.forEach((value, key) => {
    if (tagname.match(key)) values = values.concat(value);
  });
  return values;
}

export default getValuesForTagname;
