## rd-parse
A generic minimalist recursive-descent parser in Javascript.
Originally inspired by [Oleg Andreev's blog post and code](http://blog.oleganza.com/post/106246432/recursive-descent-parser-in-javascript)

**rd-parse** allows you to define your grammar directly in Javascript in a very expressive human readable fashion. Check out [an example](https://github.com/dmaevsky/keppel.git). It should be pretty much self-explanatory.

    npm install rd-parse

The parser produces a linked list of token nodes, tagging start, end, and optionally the original text content corresponding to the matched rules that you wrapped in a *Capture* directive when defining your grammar.

*node.name* will contain a tag name, and *node.value* - the original text content, unless (as a convention) the *tag.name* starts with '@', in which case *node.value* is *undefined*.

Thus, the parser just does the *dirty* job of *recursively* checking your syntax and outputting a token stream that can be processed further in a semantic context of your grammar in a more or less *linear* fashion.

