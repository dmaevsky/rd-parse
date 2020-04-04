const IGNORE = 'ignore';
const VERBATIM = 'verbatim';

class Parser {
  static parse(grammar, text) {
    return new Parser(grammar).parse(text);
  }

  constructor(grammar) {
    this._tokens = [];
    this._boundGrammar = grammar({
      Token: this.Token.bind(this),
      All: this.All.bind(this),
      Any: this.Any.bind(this),
      Plus: this.Plus.bind(this),
      Optional: this.Optional.bind(this),
      Node: this.Node.bind(this),
    });
  }

  registerToken(pattern, type) {
    this._tokens.push({
      pattern: pattern,
      type: type,
    });
  }

  // Lexer: split the text into an array of lexical token nodes
  lexer(text) {
    const nodes = [];
    let pos = 0;

    while (pos < text.length) {
      const here = pos;

      // Try matching all tokens
      for (let i = 0; i < this._tokens.length; i++) {
        const token = this._tokens[i];

        token.pattern.lastIndex = here;
        const match = token.pattern.exec(text);

        if (match && match.index === here) {
          // matched a token
          pos += match[0].length;

          if (token.type !== IGNORE) {
            nodes.push({
              start: here,
              end: pos,
              type: token.type,
              captures: match.slice(1),
            });
          }

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
  nextToken($, newProp) {
    if ($.context.lastSeen < $.ti) {
      $.context.lastSeen = $.ti;
    }
    return { ...$, ...newProp };
  }

  // Match verbatim text
  Verbatim(text) {
    return ($) => {
      let token = $.context.tokens[$.ti];
      if (!token || token.type !== VERBATIM) return $;
      if (token.captures[0] !== text) return $;
      return this.nextToken($, { ti: $.ti + 1 });
    };
  }

  // Match a token
  Token(pattern, type) {
    this.registerToken(pattern, type);

    return ($) => {
      let token = $.context.tokens[$.ti];
      if (!token || token.type !== type) return $;

      // Type is matched -> push all captures to the stack
      let stack = $.context.stack;
      stack.splice($.sp);
      stack.push(...token.captures);
      return this.nextToken($, { ti: $.ti + 1, sp: stack.length });
    };
  }

  // Wrapper to accept verbatim rules
  Apply(rule) {
    if (typeof rule === 'function') return rule;
    return this.Verbatim(rule);
  }

  // Match a sequence of rules left to right
  All(...args) {
    const rules = args.map((arg) => this.Apply(arg));

    return ($) => {
      for (var i = 0, $cur = $; i < rules.length; i++) {
        const $next = rules[i]($cur);
        if ($next === $cur) return $; // if one rule fails: fail all
        $cur = $next;
      }
      return $cur;
    };
  }

  // Match any of the rules with left-to-right preference
  Any(...args) {
    const rules = args.map((arg) => this.Apply(arg));

    return ($) => {
      for (var i = 0; i < rules.length; i++) {
        const $next = rules[i]($);
        if ($next !== $) return $next; // when one rule matches: return the match
      }
      return $;
    };
  }

  // Match a rule 1 or more times
  Plus(rule) {
    const appliedRule = this.Apply(rule);

    return ($) => {
      let $cur, $next;
      for ($cur = $; ($next = appliedRule($cur)) !== $cur; $cur = $next);
      return $cur;
    };
  }

  // Match a rule optionally
  Optional(rule) {
    rule = this.Apply(rule);

    return ($) => {
      const $next = rule($);
      if ($next !== $) return $next;

      // Otherwise return a shallow copy of the state to still indicate a match
      return Object.assign({}, $);
    };
  }

  Node(rule, reducer) {
    const appliedRule = this.Apply(rule);

    return ($) => {
      const $next = appliedRule($);
      if ($next === $) return $;

      // We have a match
      let stack = $.context.stack;
      stack.push(reducer(stack.splice($.sp), $, $next));

      return { ...$next, sp: stack.length };
    };
  }

  parse(text) {
    const context = {
      text,
      tokens: this.lexer(text),
      stack: [],
      lastSeen: -1,
    };

    const $ = {
      ti: 0,
      sp: 0,
      context,
    };

    const $next = this._boundGrammar($);

    if ($next.ti < context.tokens.length) {
      // Haven't consumed the whole input
      const err = new Error('Parsing failed');
      err.context = context;
      throw err;
    }

    return context.stack[0];
  }
}

module.exports = Parser;
