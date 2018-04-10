module.exports = Grammar;

function Grammar(Token, All, Any, Plus, Optional, Node) {

  // Y combinator
  const Y = function (gen) {
    return (function(f) {return f(f)})( function(f) {
      return gen(function() {return f(f).apply(null, arguments)});
    });
  }

  return Y(function(ThisGrammar) {
    // Special token types
    Token(/\s+|\/\/.*$/g, 'ignore');   // Ignore line comments and all whitespace
    Token(/([\[\]\(\)#=,\.])/g, 'verbatim');

    const Identifier = Token(/([a-zA-Z][a-zA-Z0-9_-]*)/g, 'identifier');
    const Text = (
      Token(/'([^']*)'/g, 'string'),
      Token(/"([^"]*)"/g, 'string')
    );

    const TagAttr = Node(All(Identifier, '=', Text), ([name, value]) => ({name, value}));
    const TagAttrBlock = Node(All('(', TagAttr, Optional(Plus(All(',', TagAttr))), ')'), stack => ({attributes: stack}));
    const TagId = Node(All('#', Identifier), ([id]) => ({id}));
    const TagClasses = Node(Plus(All('.', Identifier)), stack => ({classes: stack}));

    const TagHeader = Node(All(Identifier, Optional(TagAttrBlock), Optional(TagId), Optional(TagClasses)),
      ([name, ...rest]) => rest.reduce((acc, e) => Object.assign(acc, e), {name}));

    const TagBody = Node(All('[', ThisGrammar, ']'), ([body]) => ({body}));

    const Tag = Node(All(TagHeader, Optional(TagBody)),
      ([header, body]) => Object.assign({ type: 'tag', ...header, }, body || {}));

    const FreeText = Node(Text, ([value]) => ({ type: 'free text', value }));

    return Node(Plus(Any(Tag, FreeText)), stack => stack);
  });
}
