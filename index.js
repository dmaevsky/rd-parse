module.exports = Parser;

function Parser(grammar) {

  function Context(text) {
    this.text = text;
    this.lastPos = 0;
    this.lineNo = this.colNo = 1;

    // Track last accepted char position (for error reporting)
    this.track = function(pos) {
      if (pos >= this.lastPos) {
        this.lastPos++;
        if (this.text[pos] === '\n') { this.lineNo++;  this.colNo = 1; }
        else this.colNo++;
      }
    }
  }
  Parser.Context = Context;   // Expose Context to module consumers

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

  // Match a rule 1 or more times
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
        context: $.context,
        pos: $.pos
      }
    }
  }

  // Scan 1 symbol from input validating against alphabet (RegEx)
  function Char(alphabet) {
    return function($) {
      if ($.pos >= $.context.text.length) return $;
      if (!alphabet.test($.context.text[$.pos])) return $;
      $.context.track($.pos);

      return {
        capture: $.capture,
        context: $.context,
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
        if (nameAfter[0] !== '@') afterNode.value = $.context.text.substr($.pos, $next.pos - $.pos);
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

  this.parsingFunction = grammar(All, Any, Plus, Optional, Char, Capture);

  this.parse = function(text) {
    var $ = {
      capture: {}                       // capture stream
    , context: new Context(text)        // parsing context
    , pos: 0                            // current position in the text
    }

    var $next = this.parsingFunction($);

    var c = $.context;
    if ($next.pos != c.text.length) {
      var msg;
      if (c.lastPos >= c.text.length) msg = 'Unexpected end if input';
      else msg = 'Unexpected token at (' + c.lineNo + ':' + c.colNo + ')';
      var err = new Error(msg);
      err.$ = $next;
      throw err;
    }
    $next.capture.next = null;
    return [$.capture, $next.capture];
  }
}
