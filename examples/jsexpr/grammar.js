module.exports = Grammar;

function Grammar(Token, All, Any, Plus, Optional, Node) {
  const Star = rule => Optional(Plus(rule));

  // An "immutable" pure functional reduction of ECMAScript grammar:
  // loosely based on https://gist.github.com/avdg/1f10e268e484b1284b46
  // and http://tomcopeland.blogs.com/EcmaScript.html
  // Matches (almost) anything you can put on the right hand side of an assignment operator in ES6

  // Y combinator
  const Y = function (gen) {
    return (function(f) {return f(f)})( function(f) {
      return gen(function() {return f(f).apply(null, arguments)});
    });
  }

  return Y(function(Expression) {

    Token(/\s+/g, 'ignore');   // Ignore whitespace

    // Tokens: mostly from https://www.regular-expressions.info/examplesprogrammer.html

    // Assigning the same type to two Tokens makes them return the same matching rule, so one can be ignored
    const StringToken = (
      Token(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, 'string'),   // single-quoted
      Token(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, 'string')    // double-quoted
    );

    const NumericToken = (
      Token(/\b((?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][-+]?[0-9]+)?)\b/g, 'number'),   // decimal
      Token(/\b(0[xX][0-9a-fA-F]+)\b/g, 'number')                                   // hex
    );

    const NullToken = Token(/\b(null)\b/g, 'null');
    const BooleanToken = Token(/\b(true|false)\b/g, 'boolean');
    const RegExToken = Token(/\/([^/]+)\/([gimuy]*\b)?/g, 'regex');

    // Define 'verbatim' after the tokens so the latter get the chance to match first
    Token(/(=>|\.\.\.|\|\||&&|>>>|>>|<<|<=|>=|\btypeof\b|\binstanceof\b|\bin\b|===|!==|!=|==|\+\+|--|\bnew\b|[{}[\]().?:|&=,^%*/<>+\-~!])/g, 'verbatim');

    const IdentifierToken = Token(/([a-zA-Z_$][a-zA-Z0-9_$]*)/g, 'identifier');
    const Identifier = Node(IdentifierToken, ([name]) => ({ type: 'Identifier', name }));

    // Literals
    const StringLiteral = Node(StringToken, ([value]) => ({ type: 'Literal', value }));
    const NumericLiteral = Node(NumericToken, ([raw]) => ({ type: 'Literal', value: +raw, raw }));
    const NullLiteral = Node(NullToken, ([raw]) => ({ type: 'Literal', value: null, raw }));
    const BooleanLiteral = Node(BooleanToken, ([raw]) => ({ type: 'Literal', value: raw === 'true', raw }));
    const RegExLiteral = Node(RegExToken, ([raw, flags]) => ({ type: 'Literal', value: new RegExp(raw, flags), raw: `/${raw}/${flags||''}` }));

    const Literal = Any(StringLiteral, NumericLiteral, NullLiteral, BooleanLiteral, RegExLiteral);

    // Array literal

    const EmptyElement = Node(',', () => ({ type: 'EmptyElement'}));
    const Elision = All(',', Star(EmptyElement));
    const SpreadElement = Node(All('...', Expression), ([expression]) => ({ type: 'SpreadElement', expression }));
    const Element = Any(SpreadElement, Expression);

    const ElementList = All(Star(EmptyElement), Element, Star(All(Elision, Element)));

    const ArrayLiteral =	Node(All('[', Any(
      All(Star(EmptyElement), ']'),
      All(ElementList, Optional(Elision), ']'),
    )), elements => ({ type: 'ArrayLiteral', elements }));

    // Compound expression
    const CompoundExpression = Node(All(Expression, Star(All(',', Expression))),
      leafs => leafs.length > 1 ? { type: 'CompoundExpression', leafs } : leafs[0]);

    // Object literal

    const ComputedPropertyName = Node(All('[', CompoundExpression, ']'), ([expression]) => ({ type: 'ComputedProperty', expression }));
    const PropertyName = Any(Identifier, StringLiteral, NumericLiteral, ComputedPropertyName);
    const PropertyDefinition = Node(Any(All(PropertyName, ':', Expression), Identifier), ([name, value]) => ({name, value: value || name}));
    const PropertyDefinitions = All(PropertyDefinition, Star(All(',', PropertyDefinition)));
    const PropertyDefinitionList = Optional( All(PropertyDefinitions, Optional(',')) );
    const ObjectLiteral = Node(All('{', PropertyDefinitionList, '}'), properties => ({ type: 'ObjectLiteral', properties}));

    // Primary expression
    const PrimaryExpression = Any(Identifier, Literal, ArrayLiteral, ObjectLiteral, All('(', CompoundExpression, ')'));

    // Member expression
    const ArgumentsList = All(Element, Star(All(',', Element)));
    const Arguments = Node(All('(', ArgumentsList, Optional(','), ')'), args => ({ args }));

    const PropertyAccess = Any(All('.', Identifier), ComputedPropertyName);
    const MemberExpression = Node(All(PrimaryExpression, Star(Any(PropertyAccess, Arguments))),
      parts => parts.reduce((acc, part) => ( part.args  ?
        { type: 'CallExpression', callee: acc, arguments: part.args } :
        { type: 'MemberExpression', object: acc, property: part }
    )));

    const NewExpression = Node(All('new', MemberExpression), ([expression]) => ({ type: 'NewExpression', expression }));
    const LeftHandSideExpression = Any(NewExpression, MemberExpression);

    // Unary expressions

    const Operator = Rule => Node(Rule, (_, $) => $.context.tokens[$.ti].captures[0]);

    const UnaryOperator = Operator(Any('+', '-', '~', '!', 'typeof'));
    const UnaryExpression = Node(All(Star(UnaryOperator), LeftHandSideExpression),
      parts => parts.reduceRight((argument, operator) => ({ type: 'UnaryExpression', argument, operator })));

    // Binary expressions
    const BinaryOperatorPrecedence = [
      Any('*', '/', '%'),
      Any('+', '-'),
      Any('<<', '>>', '>>>'),
      Any('<', '>', '<=', '>=', 'instanceof', 'in'),
      Any('==', '!=', '===', '!=='),
      '&',
      '^',
      '|',
      '&&',
      '||'
    ];

    const ApplyBinaryOp = (BinaryOp, Expr) => Node(All(Operator(BinaryOp), Expr), ([operator, right]) => ({operator, right}));
    const ExpressionConstructor = (Expr, BinaryOp) => Node(All(Expr, Star(ApplyBinaryOp(BinaryOp, Expr))),
      parts => parts.reduce((left, { operator, right }) => ({ type: 'BinaryExpression', left, right, operator })));

    const LogicalORExpression = BinaryOperatorPrecedence.reduce(ExpressionConstructor, UnaryExpression);

    const ConditionalExpression = Node(All(LogicalORExpression, Optional(All('?', Expression, ':', Expression))),
      ([test, consequent, alternate]) => consequent ? ({ type: 'ConditionalExpression', test, consequent, alternate }) : test);

    // Arrow functions
    const BindingElement = Node(All(IdentifierToken, Optional(All('=', Expression))),   // Do not support destructuring just yet
      ([name, initializer]) => initializer ? { name, initializer } : { name });
    const FormalsList = Node(All(BindingElement, Star(All(',', BindingElement))), bound => ({ bound }));
    const RestElement = Node(All('...', IdentifierToken), ([rest]) => ({rest}));

    const FormalParameters = Node(All('(', Any( All(FormalsList, Optional(All(',', RestElement))), Optional(RestElement) ), ')'),
      parts => parts.reduce((acc, part) => Object.assign(acc, part), { bound: [] }));

    const ArrowParameters = Node(Any(IdentifierToken, FormalParameters), ([params]) => params.bound ? params : { bound: [{name: params}] });

    const FoolSafe = Node('{', () => { throw new Error('Object literal returned from the arrow function needs to be enclosed in ()'); });
    const ArrowResult = Any(FoolSafe, Expression);

    const ArrowFunction = Node(All(ArrowParameters, '=>', ArrowResult), ([parameters, result]) => ({ type: 'ArrowFunction', parameters, result }));

    return Any(ArrowFunction, ConditionalExpression);
  });
}
