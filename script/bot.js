var Cleverbot = require('cleverbot-node');
var bot = new Cleverbot;

bot.write('hello', function(resp) {
	console.log(resp);
});