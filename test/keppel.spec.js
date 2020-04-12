const test = require('ava');
const fs = require('fs');

const Parser = require('../src/index');
const Grammar = require('./keppel.grammar');

test('Keppel grammar parser generation', t => {
  const parser = new Parser(Grammar);

  const example1 = fs.readFileSync(__dirname + '/test1.kppl', {encoding: 'utf-8'});
  const example2 = fs.readFileSync(__dirname + '/test2.kppl', {encoding: 'utf-8'});

  t.snapshot(parser.parse(example1));
  t.snapshot(parser.parse(example2));
});
