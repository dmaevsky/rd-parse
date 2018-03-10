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

  // Lexer: returns a linked list of matched tokens
  this.lexer = function(text) {

    // Bind text in a capture
    var tracker = {
      lastSeen: null,
      raw: function(node) {
        return text.substring(node.start, this.lastSeen.end);
      }
    }

    var head = null, tail = null, pos = 0;

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

          var node = {
            start: here,
            end: pos,
            type: token.type,
            captures: match.slice(1),
            tracker: tracker
          };

          // Append the node to the linked list
          if (!tail) {
            head = tail = node;
          }
          else {
            tail.next = node;
            tail = tail.next;
          }
          break;
        }
      }

      if (pos === here) {
        // We tried all the tokens but could not move forward -> something is wrong
        throw new Error('Unexpected token at position ' + pos);
      }
    }
    return head;
  }

  // ==============
  // GRAMMAR PARSER
  // ==============

  // Helper to advance the state when match is found
  function nextToken($) {
    $.token.tracker.lastSeen = $.token;

    return {
      token: $.token.next,
      ast: $.ast
    }
  }

  var self = this;

  // Match verbatim text
  function Verbatim(text) {
    return function($) {
      if (!$.token || $.token.type !== VERBATIM) return $;
      if ($.token.captures[0] !== text) return $;
      return nextToken($);
    }
  }

  // Match a token
  function Token(pattern, type) {
    self.registerToken(pattern, type);

    return function() {
      var captures = Array.prototype.slice.apply(arguments);

      return function($) {
        if (!$.token || $.token.type !== type) return $;
  
        // Type is matched -> copy all captures to the current AST node

        if (Array.isArray($.ast)) {
          // If current AST node is an Array, captures are indices into token captures
          captures.forEach(function(index) {
            $.ast.push($.token.captures[index]);
          });
        }
        else {
          // Otherwise, captures are properties that are assigned to token captures in order
          captures.forEach(function(key, i) {
            $.ast[key] = $.token.captures[i];
          });  
        }
  
        return nextToken($);
      }  
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

  // Puts the matched rule to a new AST node, created by copying the prototype,
  // and returns a function to attach it to the parent AST object as prop (or push to the parent array)
  // optionally saving the whole raw input corresponding to the matched rule
  function Node(rule, prototype) {

    return function(prop, rawProp) {
    
      return function($) {
        var $cur = {
          token: $.token,
          ast: Array.isArray(prototype) ? Array.from(prototype) : Object.assign({}, prototype)
        };

        var $next = rule($cur);
        if ($next === $cur) return $;

        if (!$.ast) return $next;

        // Attach the matched node to the parent AST
        if (Array.isArray($.ast)) {
          $.ast.push($next.ast);
        }
        else {
          // Grab the raw input if requested
          if (rawProp) $.ast[rawProp] = $.token.tracker.raw($.token);
          $.ast[prop] = $next.ast;
        }

        return {
          token: $next.token,
          ast: $.ast
        }
      }
    }
  }


  this.parsingFunction = grammar(Token, All, Any, Plus, Optional, Node)();

  this.parse = function(text) {

    var $ = {
      token: this.lexer(text),
      ast: null
    }

    var $next = this.parsingFunction($);

    if ($next.token) {
      // Haven't consumed the whole input
      var err = new Error("Parsing failed");
      err.lastSeen = $.token.tracker.lastSeen;
      throw err;
    }

    return $next.ast;
  }
}
