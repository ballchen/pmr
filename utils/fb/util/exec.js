var exec = require('child_process').exec;
var async = require('async');
var child;

exports.execute = function(cmd, callback) {
	if (!cmd) {
		cmd = 'ls';
	}
	cmd = 'cd && ' + cmd
	console.log(cmd)
	child = exec(cmd,
		function(error, stdout, stderr) {
			var response = stdout + '\n';
			if (stderr) {
				response += '[Error]' + stderr;
			}
			if (error !== null) {
				response += '[Error]' + error;
			}
			callback(response);
		});
};