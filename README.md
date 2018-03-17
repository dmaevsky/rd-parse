# rd-parse
A generic minimalist zero dependencies recursive-descent parser in Javascript.

The API in version 2.0 is now more or less stable. No radical changes planned at the moment.
I added a proper regex-based lexer stage to split the input text into lexical tokens before passing it to the parser. This simplifies the grammar definition tremendously. The parser now produces an AST according to the specified grammar.
I also added an examples folder, and I will add more grammar examples shortly.

    npm install --save rd-parse

Usage:
```javascript
    var Parser = require('rd-parse');
    var Grammar = require('your/grammar');

    var text = "E = m * C^2";   // conforming to your grammar 
    var p = new Parser(Grammar);

    var ast = p.parse(text);

    console.log(JSON.stringify(ast, null, 2));      // Pretty print your AST
```
Detailed documentation for grammar specification / AST building rules is coming shortly. Please, refer to examples or send me an email in the meantime.

## Grammar definition rules
**rd-parse** allows you to define your grammar directly in Javascript in a very expressive human readable fashion.
Your Grammar should be a function like
```javascript
function Grammar(Token, All, Any, Plus, Optional, Node) {
    return state => nextState(state);
}
```
where the 6 callbacks provided help you construct your grammar from ground up starting from Lexer tokens and working your way up, defining grammar rules in a BNF fashion.

### Lexer
The `Token` callback...


### Grammar
One of the most important things to remember when building your grammar is that because the Parser is greedy, the order of rules in `Any` matters!
For example, `Any(Optional(Rule), SomeOtherRule)` will NEVER match SomeOtherRule: Optional(Rule) will ALWAYS be matched first!

### Special thanks
Originally inspired by [@oleganza's blog post](http://blog.oleganza.com/post/106246432/recursive-descent-parser-in-javascript).

