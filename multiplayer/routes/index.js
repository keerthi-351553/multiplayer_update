var module_race = require("../lib/modules/race");

exports.configure = function (app){
	app.get('/', function(req, res){
		res.render ('index.html', {title: 'Race'});
	});
	app.get('/dashboard', function(req, res){
		// console.log("inside dashboard");
		res.render ('file.html', {title: 'Dashboard'});
	});
}
