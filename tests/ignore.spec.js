import test from 'node:test';
import assert from 'node:assert/strict';

import Parser, { Ignore, Plus, Node } from '../src/index.js';

test('Plus with Ignore', () => {
  const Grammar = Ignore(/^\s+/, Node(Plus('a'), (_, $, $next) => [$.pos, $next.pos]));
  const parse = Parser(Grammar);

  const ast = parse('   a  a a  a   a  ');
  assert.deepEqual(ast, [3, 16]);
});
