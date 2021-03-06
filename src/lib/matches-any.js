import getValuesForTagname from './get-values-for-tagname.js';

/**
 * The `tagname` is first matched against the keys of `regexesByTagname`. When a key matches,
 * its values are compiled to regular expressions. The value to match is then matched against
 * all regular expressions. If at least one matches, this function returns true.
 *
 * @param {Object.<string, string>} regexesByTagname - Keys are compiled to regular expressions
 * and matched aganst the tagname. Values are compiled to regular expressions and are matched
 * against the supplied value.
 * @param {string} tagname
 * @param {string} value
 * @return {boolean}
*/
function matchesAny(regexesByTagname, tagname, value) {
  return getValuesForTagname(regexesByTagname, tagname)
    .some((regex) => value.match(regex) != null);
}

export default matchesAny;
