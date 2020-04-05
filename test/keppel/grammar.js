const stringGrammar = require('../string/grammar');

// Y combinator
const Y = function (gen) {
  return (function (f) {
    return f(f);
  })(function (f) {
    return gen(function () {
      return f(f).apply(null, arguments);
    });
  });
};

function grammar(ParserEngine) {
  const String_ = stringGrammar(ParserEngine);
  const { Token, All, Any, Plus, Optional, Node } = ParserEngine;
  return Y(function (Expression) {
    const Whitespace = Token(/\s+/, 'whitespace');
    const _ = Optional(Whitespace);

    const Identifier = All(_, Token(/([a-zA-Z][a-zA-Z0-9_-]*)/, 'identifier'), _);

    const TagAttr = Node(All(Identifier, '=', String_), ([name, literal]) => ({
      name,
      value: literal.value,
    }));
    const TagAttrBlock = Node(
      All(_, '(', TagAttr, Optional(Plus(All(',', TagAttr))), ')', _),
      (stack) => ({ attributes: stack }),
    );
    const TagId = Node(All('#', Identifier), ([id]) => ({ id }));
    const TagClasses = Node(Plus(All('.', Identifier)), (stack) => ({ classes: stack }));

    const TagHeader = Node(
      All(Identifier, Optional(TagAttrBlock), Optional(TagId), Optional(TagClasses)),
      ([name, ...rest]) => rest.reduce((acc, e) => Object.assign(acc, e), { name }),
    );

    const TagBody = Node(All(_, '[', _, Expression, _, ']', _), ([body]) => ({ body }));

    const Tag = Node(All(_, TagHeader, Optional(TagBody), _), ([header, body]) => ({
      type: 'tag',
      ...header,
      ...body,
    }));

    const FreeText = Node(String_, ([literal]) => ({
      type: 'free text',
      value: literal.value,
    }));

    return Node(Plus(Any(Tag, FreeText)), (stack) => stack);
  });
}

module.exports = grammar;
