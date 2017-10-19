var config = require("../../config").values
var util = require("./util")


function Operation (counts) {
var self = this;

var answers = new Array();

answers[0] = 4;
answers[1] = 1;
answers[2] = 2;
answers[3] = 1;
answers[4] = 2;
answers[5] = 2;
answers[6] = 2;
answers[7] = 2;
answers[8] = 3;
answers[9] = 1;
answers[10] = 2;
answers[11] = 4;
answers[12] = 4;
answers[13] = 4;
answers[14] = 4;
answers[15] = 4;
answers[16] = 3;
answers[17] = 2;
answers[18] = 3;
answers[19] = 2;



	
	self.solution = answers[counts];
}

function createRace(server){
	var io = require('socket.io').listen(server);
	var socket = io.sockets;
	var clients = {} //id (int) : client (obj)
	var sessions = [] //array of client id's
	var scores = {}
	var history = [];
	var hall_of_fame = [];
	var counts = 0;

	function UpdateHallOfFame(scores, timestamp){

		for (var i = 0, l = scores.length; i < l ;  i++) {
			var score = scores[i];
			score.timestamp = timestamp;
			hall_of_fame.push(score); //add all scores
		};

		//sort by score
		util.sort(hall_of_fame, 'score', true);

		//and slice array!
		return hall_of_fame.slice(0,config.game.show_hall_of_fame);
	}

	function broadcast(sessions, command, data, exception){
		for (var i=0, l=sessions.length; i < l ; i++) {
			if (!exception || sessions[i] != exception)
				clients[sessions[i]].emit(command, data);
		};
	}
	
	var operation = new Operation(counts);

	function format_scores (scores){
	   var arr = [];
	   for(var key in scores){
	      arr.push({player: key, score : scores[key]});
	   }
	   return arr;
	}

	var game_duration = config.game.duration * 1000;
	var game_started = new Date();

	setInterval(function broadcastTime(){
		var elapsed = new Date().getTime() - game_started.getTime();
		var remaining = Math.floor((game_duration - elapsed) / 1000);
		if (remaining<0){
			//archive game
			var timestamp = game_started.getDate() + '/' + (game_started.getMonth() + 1) + '/' + game_started.getFullYear() + ' ' +  game_started.getHours() + ":" + (game_started.getMinutes() > 9 ? game_started.getMinutes() : '0' + game_started.getMinutes());
			if (format_scores(scores).length){
				history.push({
					timestamp: game_started.getTime(),
					name: timestamp,
					scores: format_scores(scores)
				});

				util.sort(history, 'timestamp', true);
				history = history.slice(0,config.game.show_history_games);

				hall_of_fame = UpdateHallOfFame(format_scores(scores), timestamp);

				broadcast (sessions, 'history', history); //broadcast history
			}
			scores = {}; //reset
			game_started = new Date(); //start game again!
			broadcast (sessions, 'scores', format_scores(scores)); //broadcast scores
			broadcast (sessions, 'hall_of_fame', hall_of_fame); //broadcast "hall of fame"
			broadcast (sessions, 'new_game', null); //flash 'new game!'
		}
		else
			broadcast (sessions, 'time', remaining); //broacast time ticks

	}, 1000);

	socket.on('connection', function (client) {
	    client.on('disconnect', function () {
	        for (var i = 0, l = sessions.length; i < l; i++) {
	            if (sessions[i] == client.id) {
	                delete clients[client.id];
	                sessions.splice(i, 1);
	                break;
	            }
	        };
	    });

	    client.on('join', function (data) {
	        util.add(sessions, client.id); //add client id to list of sessions
	        clients[client.id] = client;  //store specific client object
	        client.emit('counts', counts);
            client.emit('new_operation', operation.quest); //send challenge to new client
	        client.emit('scores', format_scores(scores)); //send scores to new client
	        
	        client.emit('history', history); //send history
	        broadcast(sessions, 'hall_of_fame', hall_of_fame); //send hall of fame
	    });

	    client.on('solve_operation', function (data) {
	        if (data.operation == operation.solution) {
	            //result_operation: 1:you win, 2:other player won, 0: bad operation
	            client.emit('result_operation', 1); //msg to winner
	            broadcast(sessions, 'result_operation', 2, client.id); //msg to rest of players. someone else won!

	            var safe_name = data.name.slice(0, 25); //avoid long names
	            scores[safe_name] = (scores[safe_name] || 0) + 1 //credit score to client
	            broadcast(sessions, 'scores', format_scores(scores)); //broacast scores

	            //new challenge
	            if (counts == 19)
	            { counts = -1; }
	            counts++;
	            operation = new Operation(counts);

	            broadcast(sessions, 'new_operation', operation.quest); //new challenge for all players
	        }
	        else //baaaad. you need some math classes
	        {
	            client.emit('result_operation', 0);
	            //broadcast (sessions, 'result_operation', 0, client.id); //msg to rest of players. someone else won!

	            var safe_name = data.name.slice(0, 25); //avoid long names
	            scores[safe_name] = (scores[safe_name] || 0) - 1 //credit score to client
	            broadcast(sessions, 'scores', format_scores(scores)); //broacast scores
	        }
	    });
	});
}
exports.createRace = createRace;
