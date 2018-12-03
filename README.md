# rd-parse
A generic minimalist zero dependencies recursive-descent parser generator in Javascript.

You define your grammar directly in Javascript, in an EBNF fashion: see the examples.
The parser produces an AST according to the specified grammar.

To witness the sheer power of this tool, please check out the  [ES2015 expression grammar](https://github.com/dmaevsky/rd-parse-jsexpr/blob/master/src/grammar.js):
Javascript expression grammar, defined in Javascript, and parsed by Javascript !

API is now stable.

**!!! NOTE !!!** The jsexpr grammar in src/examples has now moved to [it's own repository](https://github.com/dmaevsky/rd-parse-jsexpr)

    npm install --save rd-parse

Usage:
```javascript
    var Parser = require('rd-parse');
    var Grammar = require('rd-parse-jsexpr');

    var p = new Parser(Grammar);

    var ast = p.parse("[1,2,3].map(a => a*a).reduce((a,b) => a + b)");

    console.log(JSON.stringify(ast, null, 2));      // Pretty print your AST
```

## Grammar definition rules
**rd-parse** allows you to define your grammar directly in Javascript in a very expressive fashion, using constructs borrowed form EBNF.
Your Grammar should be a function like
```javascript
function Grammar(Token, All, Any, Plus, Optional, Node) {
    return state => nextState(state);
}
```
where the 6 callbacks provided help you construct your grammar from ground up starting from Lexer tokens and working your way up, applying EBNF rules.
The Grammar you provide is called by the Parser constructor.

### Lexer
The `Token` callback lets you define the lexical tokens of your grammar, e.g. strings, identifiers, punctuation, etc. It registers the token with the parser and returns the rule to match it. It takes 2 parameters: a regex to match the token, and a class name. **NOTE**: regex HAS to be global (`/.../g`). The class name is arbitrary. If two tokens share the same class name they produce the same matching rule.

There are two *special* token class names though: `'ignore'` and `'verbatim'`. The tokens marked with the former are excluded from the lexer output. The latter ones produce a special matching rule to match the *exact* text: usually used for punctuation and keywords. The `'verbatim'` RegEx HAS to be enclosed in a capturing group in order to work.

If you only need to split the text into tokens, you can stop here: the lexer is all you need:
```javascript
    var Parser = require('rd-parse');
    var p = new Parser(require('your/grammar'));

    var tokens = p.lexer("E = m * C^2");
```
The lexer produces `tokens` - an Array of `{start, end, type, captures}` nodes, where `start` and `end` mark the positions of the token in the original text, `type` is the type of the token, and `captures` is an Array of captures snapped by the token's RegEx. The `'ignore'` tokens are excluded from the Array.

### Grammar
The `Token` callback lets you match the lexical tokens - the *building blocks* of your Grammar. The next 4 callbacks: `All`, `Any`, `Plus`, and `Optional` are *production rules*, allowing you to build more complicated matching rules. This is best illustrated by some examples.
```javascript
    Token(/\s+/g, 'ignore');   // Ignore whitespace
    Token(/([=+])/g, 'verbatim');
    const Identifier = Token(/([a-z])/g, 'identifier');
    const SumExpression = All(Identifier, '=', Identifier, '+', Identifier);
```
The `SumExpression` rule will match inputs like `'a = b + c'`.

*Note*: when you pass a string literal as a rule, it will be matched as is, and has to match the `'verbatim'` token RegEx.

`All` callback matches all argument rules in order.<br/>
`Any` tries argument rules from left to right and reports a match once successful.<br/>
`Plus` matches the argument rule one or more times.<br/>
`Optional` matches the argument rule one or zero times.<br/>

If your grammar is recursive (which is often the case), you might need to wrap it in a *Y-combinator*, as shown in the examples.

If you only need to test whether the input is conforming to the specified Grammar, you would not need the last callback - `Node`.<br/>
`p.parse(input)` will return successfully if the *whole* input is matched against the grammar. However, if the Grammar is specified without `Node`s the returned AST will only contain a capture from the first matched token.

The `Node` callback lets you define the rules to build your AST. It has two arguments: the rule to match, and a *reducer* callback: see below.

Each `Token` matching rule (except `'verbatim'`) will dump all capturing groups matches from its regex to a stack in the matched order.
If a rule is wrapped in a `Node`, the parser will call the provided *reducer* passing an Array, containing everything that the matched rule has put onto the stack. The *reducer* returns an object to be put back onto the stack for the parent nodes to pick up later.

For example we can wrap the `SumExpression` above in a `Node`:
```javascript
    const SumExpression = Node(All(Identifier, '=', Identifier, '+', Identifier),
      ([result, left, right]) => ({ type: 'Assignment', result, left, right }));
```
using the power of ES6 arrow functions, destructuring arguments, and shorthand notation.
The AST for the input `'a = b + c'` would be `{ type: 'Assignment', result: 'a', left: 'b', right: 'c' }`

The [ES2015 expression grammar](https://github.com/dmaevsky/rd-parse/tree/master/src/examples/jsexpr) illustrates many useful constructions.
Send me an email if you have questions :)

### Special thanks
Originally inspired by [@oleganza's blog post](http://blog.oleganza.com/post/106246432/recursive-descent-parser-in-javascript).

