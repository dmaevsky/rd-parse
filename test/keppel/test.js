const { readFileSync } = require('fs');
const { join } = require('path');
const Parser = require('../../src/index');
const grammar = require('./grammar');

describe('The keppel grammar', () => {
  it('parses a test file', () => {
    const text = readFileSync(join(__dirname, 'corpus/1.kppl'));

    expect(Parser.parse(grammar, text)).toMatchSnapshot();
  });

  it('parses another test file', () => {
    const text = readFileSync(join(__dirname, 'corpus/2.kppl'));

    expect(Parser.parse(grammar, text)).toMatchSnapshot();
  });
});
