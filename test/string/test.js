const Parser = require('../../src/index');
const grammar = require('./grammar');

describe('The string grammar', () => {
  it('parses a string containing no quotes', () => {
    const text = `'abc'`;

    expect(Parser.parse(grammar, text)).toEqual({
      type: 'StringLiteral',
      value: `abc`,
    });
  });

  it('parses a single quote string', () => {
    const text = `'"abc"'`;

    expect(Parser.parse(grammar, text)).toEqual({
      type: 'StringLiteral',
      value: `"abc"`,
    });
  });

  it('parses a double quote string', () => {
    const text = `"'abc'"`;

    expect(Parser.parse(grammar, text)).toEqual({
      type: 'StringLiteral',
      value: `'abc'`,
    });
  });
});
