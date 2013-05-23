module.exports = Parser;

function Parser(grammar) {
  var text;
  var lineNo, colNo, lastPos;     // Used in error reporting only

  this.input = function(inputText) {
    text = inputText;
    lineNo = colNo = 1;
    lastPos = 0;
    return this;
  }

  // Match a sequence of rules left to right
  function All() {
    var rules = Array.prototype.slice.apply(arguments);
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
    var rules = Array.prototype.slice.apply(arguments);
    return function($) {
      for (var i=0; i < rules.length; i++) {
        var $next = rules[i]($);
        if ($next !== $) return $next;    // when one rule matches: return the match
      }
      return $;
    }
  }

  // Match a rule 1 or more times (fixed point combinator)
  function Plus(rule) {
    return function($) {
      var $cur, $next;
      for ($cur = $; ($next = rule($cur)) !== $cur; $cur = $next);
      return $cur;
    }
  }

  // Match a rule optionally
  function Optional(rule) {
    return function($) {
      var $next = rule($);
      if ($next !== $) return $next;
      return {
        capture: $.capture,
        pos: $.pos
      }
    }
  }

  // Scan 1 symbol from input validating against alphabet (RegEx)
  function Char(alphabet) {
    return function($) {
      if ($.pos >= text.length) return $;
      if (!alphabet.test(text[$.pos])) return $;
      // track last accepted char
      if ($.pos >= lastPos) {
        lastPos++;
        if (text[$.pos] === '\n') { lineNo++;  colNo = 1; }
        else colNo++;
      }
      return {
        capture: $.capture,
        pos: $.pos + 1
      }
    }
  }

  // Capture all raw input relevant to a matched rule
  function Capture(rule, nameAfter, nameBefore) {
    return function($) {
      var $next = rule($);
      if ($next !== $) {
        var afterNode = { prev: $next.capture };
        afterNode.name = nameAfter;
        if (nameAfter[0] !== '@') afterNode.value = text.substr($.pos, $next.pos - $.pos);
        $next.capture.next = afterNode;
        $next.capture = afterNode;

        if (nameBefore) {
          var beforeNode = { prev: $.capture, next: $.capture.next };
          beforeNode.name = nameBefore;
          $.capture.next.prev = beforeNode;
          $.capture.next = beforeNode;
        }
      }
      return $next;
    }
  }

  // Enable self reference in grammar
  var parsingFunction;
  this.grammar = function($) {
    return parsingFunction($);
  }

  parsingFunction = grammar.call(this, All, Any, Plus, Optional, Char, Capture);

  this.parse = function() {
    var $ = {
      capture: {}           // capture stream
    , pos: 0                // current position in the text
    }

    var $next = parsingFunction($);
    if ($next.pos != text.length) {
      var msg;
      if (lastPos >= text.length) msg = 'Unexpected end if input';
      else msg = 'Unexpected token at (' + lineNo + ':' + colNo + ')';
      var err = Error(msg);
      err.$ = $next;
      err.lastPos = lastPos;
      err.lineNo= lineNo;
      err.colNo = colNo;
      throw err;
    }
    $next.capture.next = null;
    return $.capture;
  }
}
