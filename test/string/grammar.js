function grammar({ Any, All, Plus, Optional, Token }) {
  const SingleQuoteStringCharacter = Token(/([^'])/g, 'literal');
  const DoubleQuoteStringCharacter = Token(/([^"])/g, 'literal');

  const SingleQuoteString = All(`'`, Optional(Plus(SingleQuoteStringCharacter)), `'`);
  const DoubleQuoteString = All(`"`, Optional(Plus(DoubleQuoteStringCharacter)), `"`);

  const String = Any(SingleQuoteString, DoubleQuoteString);

  return String;
}

module.exports = grammar;
