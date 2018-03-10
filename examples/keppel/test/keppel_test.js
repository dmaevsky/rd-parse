var fs = require('fs');
var Parser = require('../../../index');
var Grammar = require('../grammar');

try {
  var text = fs.readFileSync(process.argv[2], {encoding: 'utf-8'});
  var p = new Parser(Grammar);

  var ast = p.parse(text);

  console.log(JSON.stringify(ast, null, 2));
}
catch (err) {
  console.log(err.message, err.lastSeen);
}
