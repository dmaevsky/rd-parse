# jsexpr

Javascript (ES2015) expression grammar, defined in Javascript, and parsed by Javascript !
Designed for [rd-parse](https://github.com/dmaevsky/rd-parse).

It is an "immutable" pure functional reduction of the ECMAScript grammar: loosely based on descriptions from [here](https://gist.github.com/avdg/1f10e268e484b1284b46) and [here](http://tomcopeland.blogs.com/EcmaScript.html). Matches (almost) anything you can put on the right hand side of an assignment operator in ES2015.

The mutating constructs such as increment / decrement / assignment operators, as well as higher level language constructs (loops, classes etc) are excluded.

Usage:
```javascript
    var Parser = require('rd-parse');
    var Grammar = require('rd-parse/dist/examples/jsexpr/grammar');

    var p = new Parser(Grammar);

    var ast = p.parse("[1,2,3].map(a => a*a).reduce((a,b) => a + b)");

    console.log(JSON.stringify(ast, null, 2));      // Pretty print your AST
```

I tried to keep the AST as close as possible to the format produced by another popular JS expression parser [jsep](http://jsep.from.so/).

This grammar is slightly richer than `jsep` though. Unlike the latter, I properly parse ES6 arrow functions, object literals, and support spread elements, and shorthand notation. The code is also readable ;)
