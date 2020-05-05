# rd-parse
A generic minimalist zero dependencies recursive-descent parser generator in Javascript.

You define your grammar directly in Javascript, in an EBNF fashion: see the examples.
The parser produces an AST according to the specified grammar.

To witness the sheer power of this tool, please check out the [ES2015 expression grammar](https://github.com/dmaevsky/rd-parse-jsexpr/blob/master/src/grammar.js):
Javascript expression grammar, defined in Javascript, and parsed by Javascript !

### V3 release notes
- rd-parse is now an ES6 module. package.json is not yet compliant with the recently added Node's ESM support, but will be once it's stable. In the meantime use it with `node -r esm` in Node environment
- Rule constructors are now purely functional independent exports, as is the Parser generator itself: check out the examples
- No more upfront tokenization. The parser is tokenizing the input as it proceeds, using a stack of lexer contexts (used to easily exclude chunks of input such as whitespace or comments)

Usage:
```javascript
    import Parser from 'rd-parse';
    import Grammar from 'rd-parse-jsexpr';

    const parser = Parser(Grammar);

    const ast = parser('[1,2,3].map(a => a*a).reduce((a,b) => a + b)');

    console.log(JSON.stringify(ast, null, 2));      // Pretty print your AST
```

## Grammar definition rules
With **rd-parse** you can define your grammar directly in Javascript in a very expressive fashion, using constructs borrowed form EBNF.
The package exports the elementary combinators that you can use to construct your grammar from ground up, starting from Lexer tokens and working your way up, applying EBNF rules.

### Lexer
**rd-parse** is using regexes to tokenize the input, so an elementary rule (token) would be just a string (matched exactly) or a regex.
**IMPORTANT**: the regex rules **must** start with `^` in order to match the input at the current parsing position!

The package exports a lexer helper `Ignore`. If you wrap a rule with `Ignore(regex, rule)` the parser will create a lexer context for the `rule` being matched that ignores chunks of input matching the provided `regex` (e.g. whitespace or comments). The lexer context is pushed on a stack inside the parsing state, so the the `rule`'s children rules may use different lexer contexts (i.e. in string interpolation).

All captures in regex rules are put on the semantic stack inside the parsing state, and can be used by higher order rules' reducers to build the AST.

### Grammar
The package exports the standard combinators `(All, Any, Plus, Optional, Star)`: the *production rules* allowing you to build more complicated matching rules. This is best illustrated by some examples.
```javascript
const StringToken = Any(
  /^('[^'\\]*(?:\\.[^'\\]*)*')/,  // single-quoted
  /^("[^"\\]*(?:\\.[^"\\]*)*")/,  // double-quoted
);

const Identifier = /^([a-zA-Z_$][a-zA-Z0-9_$]*)/;
const SumExpression = All(Identifier, '=', Identifier, '+', Identifier);
```
The `SumExpression` rule will match inputs like `a = b + c`.

`All` combinator matches all argument rules in order.<br/>
`Any` tries argument rules from left to right and reports a match once successful.<br/>
`Plus` matches the argument rule one or more times.<br/>
`Optional` matches the argument rule one or zero times.<br/>
`Star` matches the argument rule zero or more times: `Star = rule => Optional(Plus(rule))`.<br/>

If your grammar is recursive (which is often the case), you might need to wrap it in a *Y-combinator*, as shown in the examples. `Y` is exported from the package as a matter of convenience.

### Building AST
Use the `Node` helper to define how to build your AST. It has two arguments: the rule to match, and a *reducer* callback: see below.

Each regex matching rule will dump all capturing groups matches from its regex to a stack in the matched order.
If a rule is wrapped in a `Node`, the parser will call the provided *reducer* passing an Array, containing everything that the matched rule has put onto the stack. The *reducer* returns an object to be put back onto the stack for the parent nodes to pick up later.

For example we can wrap the `SumExpression` above in a `Node`:
```javascript
    const SumExpression = Node(All(Identifier, '=', Identifier, '+', Identifier),
      ([result, left, right]) => ({ type: 'Assignment', result, left, right }));
```
using the power of ES6 arrow functions, destructuring arguments, and shorthand notation.
The AST for the input `'a = b + c'` would be `{ type: 'Assignment', result: 'a', left: 'b', right: 'c' }`

The [ES2015 expression grammar](https://github.com/dmaevsky/rd-parse-jsexpr/blob/master/src/grammar.js) illustrates many useful constructions.
Send me an email if you have questions :)

### Special thanks
Originally inspired by [@oleganza's blog post](http://blog.oleganza.com/post/106246432/recursive-descent-parser-in-javascript).
