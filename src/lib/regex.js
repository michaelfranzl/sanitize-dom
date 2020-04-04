function compileRegex(str) {
  return new RegExp(`^${str}$`, 'g');
}

export default compileRegex;
