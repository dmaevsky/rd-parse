function Parser(grammar) {

  const scanIgnore = $ => {
    const toIgnore = $.ignore[$.ignore.length - 1];

    // If we have been here before, we have already moved $.pos past all ignored symbols
    if (!toIgnore || $.pos <= $.lastSeen) return;

    for (let match; match = toIgnore.exec($.text.substring($.pos)); $.pos += match[0].length);

    $.lastSeen = $.pos;
  }

  const RegexToken = pattern => $ => {
    scanIgnore($);

    const match = pattern.exec($.text.substring($.pos));
    if (!match) return $;

    // Token is matched -> push all captures to the stack and return the match
    $.stack.splice($.sp);
    $.stack.push(...match.slice(1));

    return {
      ...$,
      pos: $.pos + match[0].length,
      sp: $.stack.length
    }
  }

  const StringToken = pattern => $ => {
    scanIgnore($);

    if ($.text.startsWith(pattern, $.pos)) {
      return {
        ...$,
        pos: $.pos + pattern.length
      };
    }
    return $;
  }

  function Use(rule) {
    if (typeof(rule) === 'function') return rule;
    if (rule instanceof RegExp) return RegexToken(rule);
    if (typeof(rule) === 'string') return StringToken(rule);
    throw new Error('Invalid rule');
  }

  function Ignore(pattern, rule) {
    rule = Use(rule);

    return $ => {
      $.ignore.push(pattern);
      const $next = rule($);

      scanIgnore($next);
      $.ignore.pop();

      return $next;
    };
  }

  // Match a sequence of rules left to right
  function All(...rules) {
    rules = rules.map(Use);

    return $ => {
      let $cur = $;
      for (let i = 0; i < rules.length; i++) {
        const $next = rules[i]($cur);
        if ($next === $cur) return $;   // if one rule fails: fail all
        $cur = $next;
      }
      return $cur;
    };
  }

  // Match any of the rules with left-to-right preference
  function Any(...rules) {
    rules = rules.map(Use);

    return $ => {
      for (let i = 0; i < rules.length; i++) {
        const $next = rules[i]($);
        if ($next !== $) return $next;    // when one rule matches: return the match
      }
      return $;
    };
  }

  // Match a rule 1 or more times
  function Plus(rule) {
    rule = Use(rule);

    return $ => {
      let $cur, $next;
      for ($cur = $; ($next = rule($cur)) !== $cur; $cur = $next);
      return $cur;
    };
  }

  // Match a rule optionally
  function Optional(rule) {
    rule = Use(rule);

    return $ => {
      const $next = rule($);
      if ($next !== $) return $next;

      // Otherwise return a shallow copy of the state to still indicate a match
      return {...$};
    };
  }

  function Node(rule, reducer) {
    rule = Use(rule);

    return $ => {
      const $next = rule($);
      if ($next === $) return $;

      // We have a match
      $.stack.push(reducer($.stack.splice($.sp), $, $next));

      return {
        ...$next,
        sp: $.stack.length
      };
    };
  }

  const MatchGrammar = grammar({ Ignore, All, Any, Plus, Optional, Node });

  return text => {
    const $ = {
      text,
      ignore: [],
      stack: [],
      lastSeen: -1,
      pos: 0, sp: 0,
    }

    const $next = MatchGrammar($);

    if ($next.pos < text.length) {
      // Haven't consumed the whole input
      throw new Error(`Unexpected token at pos ${$.lastSeen}. Remainder: ${text.substring($.lastSeen)}`);
    }

    return $.stack[0];
  }
}

module.exports = Parser;
