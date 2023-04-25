/**
 * Returns an environment variable, or throws an exception if it does not exist.
 * @param name {string}
 */
exports.env = function (name) {
  const value = process.env[name];
  if (value) {
    return value;
  }
  throw new Error(`Required environment variable missing: ${name}`);
}
