const Parser = require('../../src/index');
const grammar = require('./grammar');

describe.skip('The string grammar', () => {
  it('parses a single quote string', () => {
    const text = `'"abc"'`;

    expect(Parser.parse(grammar, text)).toMatchSnapshot();
  });

  it('parses a double quote string', () => {
    const text = `"'abc'"`;

    expect(Parser.parse(grammar, text)).toMatchSnapshot();
  });
});
