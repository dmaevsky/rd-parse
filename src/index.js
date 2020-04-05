const cloneRegExp = require('clone-regexp');
const { equals, indexOfAny } = require('./text-utils');

const lineTerminators = ['\r\n', '\n'];

class RuleEngine {
  constructor(grammar) {
    this._boundGrammar = grammar({
      Token: this.Token.bind(this),
      All: this.All.bind(this),
      Any: this.Any.bind(this),
      Plus: this.Plus.bind(this),
      Optional: this.Optional.bind(this),
      Node: this.Node.bind(this),
      Debug: this.Debug.bind(this),
    });
  }

  sanitizeRule(rule) {
    if (typeof rule === 'string') {
      return this.StringToken(rule);
    } else if (typeof rule === 'function') {
      return rule;
    } else {
      throw new Error('A rule must be a string or a function');
    }
  }

  acceptToken(ctx, $, accepted) {
    let { tp, lp, col } = $;

    const endTp = tp + accepted.length;
    const { lines } = ctx;

    while (lines[lp + 1] < endTp) {
      lp++;
    }

    col = lines[lp + 1] - endTp;
    tp += accepted.length;

    return { tp, lp, col };
  }

  RegexToken(pattern) {
    const pattern_ = cloneRegExp(pattern, {
      // By adding and empty capture as an alternative, we ensure that the
      // engine won't look ahead. Technique cribbed from:
      // https://mrale.ph/blog/2016/11/23/making-less-dart-faster.html
      source: `${pattern.source}|()`,
      global: true,
    });

    return (ctx, $) => {
      const { stack, text } = ctx;

      pattern_.lastIndex = $.tp;
      const match = pattern_.exec(text);
      if (match == null || match[0] == '') {
        return $;
      }

      // Type is matched -> push all captures to the stack
      stack.splice($.sp);
      stack.push(...match.slice(1, -1)); // -1 eliminates the empty capture
      return { ...$, ...this.acceptToken(ctx, $, match[0]), sp: stack.length };
    };
  }

  StringToken(value) {
    return (ctx, $) => {
      if (!equals(value, ctx.text, $.tp)) {
        return $;
      }

      return { ...$, ...this.acceptToken(ctx, $, value) };
    };
  }

  // Match a token
  Token(value) {
    if (typeof value === 'string') {
      return this.StringToken(value);
    } else if (value instanceof RegExp) {
      return this.RegexToken(value);
    } else {
      throw new Error('Token value must be either a string or regular expression');
    }
  }

  // Match a sequence of rules left to right
  All(...rules) {
    const rules_ = rules.map((arg) => this.sanitizeRule(arg));

    return (ctx, $) => {
      for (var i = 0, $cur = $; i < rules.length; i++) {
        const $next = rules_[i](ctx, $cur);
        if ($next === $cur) {
          return $; // if one rule fails: fail all
        }
        $cur = $next;
      }
      return $cur;
    };
  }

  // Match any of the rules with left-to-right preference
  Any(...rules) {
    const rules_ = rules.map((arg) => this.sanitizeRule(arg));

    return (ctx, $) => {
      for (var i = 0; i < rules_.length; i++) {
        const $next = rules_[i](ctx, $);
        if ($next !== $) {
          return $next;
        } // when one rule matches: return the match
      }
      return $;
    };
  }

  // Match a rule 1 or more times
  Plus(rule) {
    const rule_ = this.sanitizeRule(rule);

    return (ctx, $) => {
      let $cur, $next;
      for ($cur = $; ($next = rule_(ctx, $cur)) !== $cur; $cur = $next);
      if ($cur === $) {
      } else {
      }
      return $cur;
    };
  }

  // Match a rule optionally
  Optional(rule) {
    const rule_ = this.sanitizeRule(rule);

    return (ctx, $) => {
      const $next = rule_(ctx, $);
      if ($next !== $) return $next;

      // Otherwise return a shallow copy of the state to still indicate a match
      return { ...$ };
    };
  }

  Node(rule, reducer) {
    const rule_ = this.sanitizeRule(rule);

    return (ctx, $) => {
      const $next = rule_(ctx, $);
      if ($next === $) return $;

      // We have a match
      const { stack } = ctx;
      stack.push(reducer(stack.splice($.sp), ctx, $, $next));

      return { ...$next, sp: stack.length };
    };
  }

  Debug(rule) {
    const rule_ = this.sanitizeRule(rule);
    return (ctx, $) => {
      debugger;
      return rule_(ctx, $);
    };
  }

  tokenizeLines(ctx) {
    const { lines, text } = ctx;

    let tp = 0;
    let matchLen = 0;
    let idx;
    do {
      lines.push(tp);
      [idx, matchLen] = indexOfAny(lineTerminators, text, tp);
      tp += idx + matchLen;
    } while (idx >= 0);
  }

  evaluate(text, { multiline = true } = {}) {
    const ctx = {
      text,
      stack: [],
      lines: [],
    };

    if (multiline) {
      this.tokenizeLines(ctx);
    }

    const $ = {
      sp: 0, // stack pointer
      tp: 0, // text position
      lp: 0, // line pointer
      col: 0, // column in line
    };

    const $next = this._boundGrammar(ctx, $);

    if ($next.tp < text.length) {
      // Haven't consumed the whole input
      const errPosition = multiline
        ? `line ${$next.lp + 1} column ${$next.col + 1}`
        : `pos ${$next.tp}`;
      const err = new Error(`Parsing failed. Unexpected symbol at ${errPosition}`);
      err.context = ctx;
      throw err;
    }

    return ctx.stack[0];
  }
}

class Parser {
  static parse(grammar, text) {
    return new Parser(grammar).parse(text);
  }

  constructor(grammar) {
    this._ruleEngine = new RuleEngine(grammar);
  }

  parse(text) {
    return this._ruleEngine.evaluate(text);
  }
}

module.exports = Parser;
