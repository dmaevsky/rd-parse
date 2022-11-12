import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'fs';
import snapshot from 'usnap';

snapshot.setup(import.meta.url);

import Parser from '../src/index.js';
import Grammar from './keppel.grammar.js';

const parser = Parser(Grammar);

test('Non-string input throws', () => {
  assert.throws(() => parser({ text: 'text' }),
    new Error('Parsing function expects a string input')
  );
});

test('Keppel grammar', async t => {
  const example1 = fs.readFileSync(`${process.cwd()}/tests/test1.kppl`, {encoding: 'utf-8'});
  const example2 = fs.readFileSync(`${process.cwd()}/tests/test2.kppl`, {encoding: 'utf-8'});

  await snapshot(parser(example1), t.name);
  await snapshot(parser(example2), t.name);
});
