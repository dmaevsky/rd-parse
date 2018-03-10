module.exports = Grammar;

function Grammar(Token, All, Any, Plus, Optional, Node) {

  // Y combinator
  var Y = function (gen) {
    return (function(f) {return f(f)})( function(f) {
      return gen(function() {return f(f).apply(null, arguments)});
    });
  }

  return Y(function(thisGrammar) {
    // Special token types
    Token(/\s+|\/\/.*$/g, 'ignore');   // Ignore line comments and all whitespace
    Token(/([\[\]\(\)#=,\.])/g, 'verbatim');

    var identifier = Token(/([a-zA-Z][a-zA-Z0-9_-]*)/g, 'identifier');
    var singleQuoted = Token(/'([^']*)'/g, 'singleQuoted');
    var doubleQuoted = Token(/"([^"]*)"/g, 'doubleQuoted');
    var text = prop => Any(singleQuoted(prop), doubleQuoted(prop));

    var attachThisGrammar = prop => function() { return thisGrammar(prop).apply(null, arguments); }

    var tagAttr = Node(All(identifier('name'), '=', text('value')), {})();
    var tagAttrBlock = Node(All('(', tagAttr, Optional(Plus(All(',', tagAttr))), ')'), [])('attributes', 'rawAttributes');
    var tagId = All('#', identifier('id'));
    var tagClasses = Node(Plus(All('.', identifier(0))), [])('classes');
    var tagHeader = Node(All(identifier('name'), Optional(tagAttrBlock), Optional(tagId), Optional(tagClasses)), {})('header');
    var tagBody = All('[', attachThisGrammar('body'), ']');
    var tag = Node(All(tagHeader, Optional(tagBody)), { type: 'tag'})();
    var freeText = Node(text('value'), { type: 'free text'})();

    return Node(Optional(Plus(Any(tag, freeText))), []);
  });
}
