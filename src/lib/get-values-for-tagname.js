import compileRegex from './regex.js';

function getValuesForTagname(obj, tagname) {
  const tagRegexStrings = Object.getOwnPropertyNames(obj);
  let values = [];
  for (let i = 0; i < tagRegexStrings.length; i += 1) {
    const tagRegexString = tagRegexStrings[i];
    const tagRegex = compileRegex(tagRegexString);
    if (tagname.match(tagRegex)) values = values.concat(obj[tagRegexString]);
  }
  return values;
}

export default getValuesForTagname;
