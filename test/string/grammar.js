function grammar({ Node, Any, All, Optional, Plus, Token }) {
  const Whitespace = Token(/\s+/);
  const _ = Optional(Whitespace);
  const SingleQuoteStringCharacter = Token(/([^'])/);
  const DoubleQuoteStringCharacter = Token(/([^"])/);

  const SingleQuoteString = All(`'`, Optional(Plus(SingleQuoteStringCharacter)), `'`);
  const DoubleQuoteString = All(`"`, Optional(Plus(DoubleQuoteStringCharacter)), `"`);

  return Node(All(_, Any(SingleQuoteString, DoubleQuoteString), _), (value) => ({
    type: 'StringLiteral',
    value: value.join(''),
  }));
}

module.exports = grammar;
