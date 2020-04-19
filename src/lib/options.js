function compileRegex(str) {
  return new RegExp(`^${str}\$`, 'i');
}

function precompileOptions(options) {
  const opts = options;

  const keysToRegexp = ['filters_by_tag'];
  const keysAndValuesToRegexp = [
    'remove_tags_direct',
    'remove_tags_deep',
    'flatten_tags_direct',
    'flatten_tags_deep',
    'allow_tags_direct',
    'allow_tags_deep',
    'allow_attributes_by_tag',
    'allow_classes_by_tag',
  ];

  keysAndValuesToRegexp.forEach((key) => {
    const option = opts[key];

    if (!option) return;

    const tagExpressions = Object.getOwnPropertyNames(option);

    const optionMap = new Map();
    tagExpressions.forEach((tagExp) => {
      const valueExpressions = [].concat(option[tagExp]); // support for string and array

      const valueRegExps = valueExpressions.map((valueExp) => compileRegex(valueExp));
      const tagRegExp = compileRegex(tagExp);
      optionMap.set(tagRegExp, valueRegExps);
    });

    opts[key] = optionMap;
  });

  keysToRegexp.forEach((key) => {
    const option = opts[key];

    const tagExpressions = Object.getOwnPropertyNames(option);

    const optionMap = new Map();
    tagExpressions.forEach((tagExp) => {
      const tagRegExp = compileRegex(tagExp);
      optionMap.set(tagRegExp, option[tagExp]);
    });

    opts[key] = optionMap;
  });

  return opts;
}

export default precompileOptions;
