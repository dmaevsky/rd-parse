## rd-parse
A generic minimalist recursive-descent parser in Javascript.
Originally inspired by [@oleganza's blog post and code](http://blog.oleganza.com/post/106246432/recursive-descent-parser-in-javascript).

The version 1.0 is a complete re-write.
I added a proper regex-based lexer stage to split the input text into lexical tokens before passing it to the parser. This simplifies the grammar definition tremendously. The parser now produces an AST according to the specified grammar.
I also added an examples folder, and I will add more grammar examples shortly.

**rd-parse** allows you to define your grammar directly in Javascript in a very expressive human readable fashion.

    npm install --save rd-parse

Usage:

    var Parser = require('rd-parse');
    var Grammar = require('your/grammar');

    var text = "E = m * C^2";   // conforming to your grammar 
    var p = new Parser(Grammar);

    var ast = p.parse(text);

    console.log(JSON.stringify(ast, null, 2));      // Pretty print your AST

Detailed documentation for grammar specification / AST building rules is coming shortly. Please, refer to examples or send me an email in the meantime.
