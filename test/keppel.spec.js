import test from 'ava';
import fs from 'fs';

import Parser from '../src/index';
import Grammar from './keppel.grammar';

test('Keppel grammar parser generation', t => {
  const parser = Parser(Grammar);

  const example1 = fs.readFileSync(__dirname + '/test1.kppl', {encoding: 'utf-8'});
  const example2 = fs.readFileSync(__dirname + '/test2.kppl', {encoding: 'utf-8'});

  t.snapshot(parser(example1));
  t.snapshot(parser(example2));
});
