module.exports = Parser;

function Parser(grammar) {
  const IGNORE = 'ignore';
  const VERBATIM = 'verbatim';

  this.tokens = [];
  this.registerToken = function(pattern, type) {
    this.tokens.push({
      pattern: pattern,
      type: type
    });
  }

  // Lexer: split the text into an array of lexical token nodes
  this.lexer = function(text) {

    var nodes = [], pos = 0;

    while (pos < text.length) {
      var here = pos;

      // Try matching all tokens
      for (var i = 0; i < this.tokens.length; i++) {
        var token = this.tokens[i];

        token.pattern.lastIndex = here;
        var match = token.pattern.exec(text);

        if (match && match.index === here) {    // matched a token
          pos += match[0].length;
          
          if (token.type === IGNORE) break;

          nodes.push({
            start: here,
            end: pos,
            type: token.type,
            captures: match.slice(1),
          });
          break;
        }
      }

      if (pos === here) {
        // We tried all the tokens but could not move forward -> something is wrong
        throw new Error('Unexpected token at position ' + pos + '. Remainder: ' + text.substr(pos));
      }
    }
    return nodes;
  }

  // ==============
  // GRAMMAR PARSER
  // ==============

  // Keep track of the last matched token and advance to the next
  function nextToken($, newProp) {
    if ($.context.lastSeen < $.ti) {
      $.context.lastSeen = $.ti;
    }
    return Object.assign({}, $, newProp);
  }

  var self = this;

  // Match verbatim text
  function Verbatim(text) {
    return function($) {
      let token = $.context.tokens[$.ti];
      if (!token || token.type !== VERBATIM) return $;
      if (token.captures[0] !== text) return $;
      return nextToken($, { ti: $.ti + 1});
    }
  }

  // Match a token
  function Token(pattern, type) {
    self.registerToken(pattern, type);

    return function($) {
      let token = $.context.tokens[$.ti];
      if (!token || token.type !== type) return $;

      // Type is matched -> push all captures to the stack
      let stack = $.context.stack;
      stack.splice($.sp);
      stack.push(...token.captures);
      return nextToken($, { ti: $.ti + 1, sp: stack.length });
    }
  }

  // Wrapper to accept verbatim rules
  function Apply(rule) {
    if (typeof(rule) === 'function') return rule;
    return Verbatim(rule);
  }

  // Match a sequence of rules left to right
  function All() {
    var rules = Array.prototype.slice.apply(arguments).map(Apply);

    return function($) {
      for (var i=0, $cur = $; i < rules.length; i++) {
        var $next = rules[i]($cur);
        if ($next === $cur) return $;   // if one rule fails: fail all
        $cur = $next;
      }
      return $cur;
    }
  }

  // Match any of the rules with left-to-right preference
  function Any() {
    var rules = Array.prototype.slice.apply(arguments).map(Apply);

    return function($) {
      for (var i=0; i < rules.length; i++) {
        var $next = rules[i]($);
        if ($next !== $) return $next;    // when one rule matches: return the match
      }
      return $;
    }
  }

  // Match a rule 1 or more times
  function Plus(rule) {
    rule = Apply(rule);

    return function($) {
      var $cur, $next;
      for ($cur = $; ($next = rule($cur)) !== $cur; $cur = $next);
      return $cur;
    }
  }

  // Match a rule optionally
  function Optional(rule) {
    rule = Apply(rule);

    return function($) {
      var $next = rule($);
      if ($next !== $) return $next;

      // Otherwise return a shallow copy of the state to still indicate a match
      return Object.assign({}, $);
    }
  }

  function Node(rule, reducer) {
    rule = Apply(rule);
    
    return function($) {
      var $next = rule($);
      if ($next === $) return $;

      // We have a match
      let stack = $.context.stack;
      stack.push(reducer(stack.splice($.sp), $, $next));

      return Object.assign({}, $next, { sp: stack.length });
    }
  }


  this.parsingFunction = grammar(Token, All, Any, Plus, Optional, Node);

  this.parse = function(text) {

    var context = {
      text,
      tokens: this.lexer(text),
      stack: [],
      lastSeen: -1,
    }

    var $ = {
      ti: 0, sp: 0,
      context
    }

    var $next = this.parsingFunction($);

    if ($next.ti < context.tokens.length) {
      // Haven't consumed the whole input
      var err = new Error("Parsing failed");
      err.context = context;
      throw err;
    }

    return context.stack[0];
  }
}
