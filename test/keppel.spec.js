import test from 'ava';
import fs from 'fs';

import Parser from '../src/index.js';
import Grammar from './keppel.grammar.js';

const parser = Parser(Grammar);

test('Non-string input throws', t => {
  t.throws(() => parser({ text: 'text' }), {
    message: 'Parsing function expects a string input'
  });
});

test('Keppel grammar parser generation', t => {
  const example1 = fs.readFileSync(`${process.cwd()}/test/test1.kppl`, {encoding: 'utf-8'});
  const example2 = fs.readFileSync(`${process.cwd()}/test/test2.kppl`, {encoding: 'utf-8'});

  t.snapshot(parser(example1));
  t.snapshot(parser(example2));
});
