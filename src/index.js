function locAt(text, newPos, { pos, line, column }) {
  while (pos < newPos) {
    const ch = text[pos++];
    if (ch === '\n') {
      column = 1;
      line++;
    }
    else column++;
  }
  return { pos, line, column };
}

const scanIgnore = $ => {
  if ($.ignore.length) {
    const toIgnore = $.ignore.pop();
    const $next = toIgnore ? toIgnore($) : $;
    $.ignore.push(toIgnore);

    if ($next !== $) {
      // Make sure ignore rule did not leave anything on the stack
      $.stack.splice($.sp);
      $.pos = $next.pos;
    }
  }
  Object.assign($.lastSeen, locAt($.text, $.pos, $.lastSeen));
}

export const RegexToken = pattern => $ => {
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
  };
}

export const StringToken = pattern => $ => {
  scanIgnore($);

  if ($.text.startsWith(pattern, $.pos)) {
    return {
      ...$,
      pos: $.pos + pattern.length
    };
  }
  return $;
}

export function Use(rule) {
  if (typeof(rule) === 'function') return rule;
  if (rule instanceof RegExp) return RegexToken(rule);
  if (typeof(rule) === 'string') return StringToken(rule);
  throw new Error('Invalid rule');
}

export function Ignore(toIgnore, rule) {
  rule = Use(rule);
  toIgnore = Plus(toIgnore);

  return $ => {
    $.ignore.push(toIgnore);
    const $next = rule($);

    scanIgnore($next);
    $.ignore.pop();

    return $next;
  };
}

// Match a sequence of rules left to right
export function All(...rules) {
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
export function Any(...rules) {
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
export function Plus(rule) {
  rule = Use(rule);

  return $ => {
    let $cur, $next;
    for ($cur = $; ($next = rule($cur)) !== $cur; $cur = $next);
    return $cur;
  };
}

// Match a rule optionally
export function Optional(rule) {
  rule = Use(rule);

  return $ => {
    const $next = rule($);
    if ($next !== $) return $next;

    // Otherwise return a shallow copy of the state to still indicate a match
    return {...$};
  };
}

export function Node(rule, reducer) {
  rule = Use(rule);

  return $ => {
    const $next = rule($);
    if ($next === $) return $;

    // We have a match
    $.stack.splice($next.sp);

    const node = reducer($.stack.splice($.sp), $, $next);
    if (node !== null) $.stack.push(node);

    return {
      ...$next,
      sp: $.stack.length
    };
  };
}

export const Star = rule => Optional(Plus(rule));

// Y combinator: often useful to define recursive grammars
export const Y = proc => (x => proc(y => (x(x))(y)))(x => proc(y => (x(x))(y)));

export const START = (text, pos = 0) => ({
  text,
  ignore: [],
  stack: [],
  sp: 0,
  lastSeen: locAt(text, pos, { pos: 0, line: 1, column: 1 }),
  pos,
});

export default function Parser(Grammar, pos = 0, partial = false) {

  return text => {
    if (typeof text !== 'string') {
      throw new Error('Parsing function expects a string input');
    }

    const $ = START(text, pos);
    const $next = Grammar($);

    if ($ === $next || !partial && $next.pos < text.length) {
      // No match or haven't consumed the whole input
      throw new Error(`Unexpected token at ${$.lastSeen.line}:${$.lastSeen.column}. Remainder: ${text.slice($.lastSeen.pos)}`);
    }

    return $.stack[0];
  }
}
