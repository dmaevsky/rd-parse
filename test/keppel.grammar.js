import { Ignore, All, Any, Plus, Optional, Node } from '../src/index.js';

const Identifier = /^([a-zA-Z][a-zA-Z0-9_-]*)/;
const Text = Any(
  /^'([^']*)'/,
  /^"([^"]*)"/
);

// Ignore line comments and all whitespace

const ThisGrammar = $ => Keppel($);

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

const Keppel = Node(Plus(Any(Tag, FreeText)), stack => stack);

export default Ignore(/^\s+|^\/\/[^\r\n]*\n/, ThisGrammar);
