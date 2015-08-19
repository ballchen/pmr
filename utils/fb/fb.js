var cheerio = require('cheerio');
var fs = require('fs');
var request = require('request');
var tough = require('tough-cookie');
var _ = require('underscore');
var async = require('async');
var secret = require('./secret.js');
var CronJob = require('cron').CronJob;
var commands = require('./commands').commands;
var Cleverbot = require('cleverbot-node');
var async = require('async');
var request = require('request');
var _ = require('underscore');
var wootalk_url = 'https://wootalk.today/';
var WebSocket = require('ws');
var ent = require('ent');

var wootalk_header = {
	'Host': 'wootalk.today',
	'Origin': 'https://wootalk.today',
	'Cache-Control': 'no-cache',
	'Pragma': 'no-cache',
	'Connection': 'Upgrade',
	'Upgrade': 'websocket',
	'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.90 Safari/537.36',
	'Sec-WebSocket-Version': 13,
	'Accept-Encoding': 'gzip, deflate, sdch',
	'Accept-Language': 'zh-TW,zh;q=0.8,en-US;q=0.6,en;q=0.4,zh-CN;q=0.2'
};
var Randomize = function() {
	return Math.floor((Math.random() * 100000) + 50000);
};

var leavecmd = '["change_person",{}]';



//hello
var message = 'https://www.facebook.com/ajax/mercury/send_messages.php';
var friends = 'https://www.facebook.com/friends';

var users = {
	'甲豪': '100000187207997',
	'小馬': '100000032300808',
	'樸樸': '100002413654974'
};
var lonely = false;
var wootalk_spy_on = false;
var wootalk_spy_timeout = false;

var wootalk_chat = '';
var userId_A = null;

var bot = new Cleverbot;
var wsA;
var wsB;
var wsChat;

var fightback = true;


//initial a cookie jar to save the session
var j = request.jar();
var fbrequest = request.defaults({
	headers: {
		'User-Agent': 'Mozilla/5.0 (Windows NT 5.1; rv:31.0) Gecko/20100101 Firefox/31.0',
		'Cookie': '_js_reg_fb_gate=https%3A%2F%2Fwww.facebook.com%2F;'
	},
	jar: j
})

// let fb know you are alive 
exports.pingpong = function(fbid) {
	var ping = 'https://3-edge-chat.facebook.com/active_ping?channel=p_' + fbid.id + '&partition=-2&clientid=67c47f2f&cb=hsod&cap=8&uid=' + fbid.id + '&viewer_uid=' + fbid.id + '&sticky_token=444&sticky_pool=ash2c07_chat-proxy&state=active'
	var job = new CronJob({
		cronTime: '0 * * * * *',
		onTick: function() {
			fbrequest({
				method: "GET",
				url: ping
			}, function(err, httpResponse, body) {
				if (body) {
					// console.log(body);
				}
			})
		},
		start: false,
		timeZone: "Asia/Taipei"
	});

	job.start();
}


exports.login = function login(callback) {
	console.log('login....')
	fbrequest({
		method: 'GET',
		url: 'https://www.facebook.com/login.php',
	}, function(err, httpResponse, body) {
		if (err) return callback('error: login failed.')

		$ = cheerio.load(body);
		var login_form = new Object();
		$('form#login_form input').each(function(i, elem) {
			login_form[$(this).attr('name')] = $(this).attr('value')
		})

		login_form.pass = secret.password
		login_form.email = secret.email
		fbrequest({
			method: 'POST',
			url: 'https://www.facebook.com/login.php',
			form: login_form,
		}, function(err, httpResponse, body) {
			if (err) console.log(err)

			fbrequest({
				method: 'GET',
				url: 'https://www.facebook.com'
			}, function(err, httpResponse, body) {

				console.log('logged in!')

				fb_userid = httpResponse.request.headers.Cookie.match(/c_user\=(.*?)\;/)[1];
				fb_dtsg = (body.split(/fb_dtsg" value="(.*?)"/)[1]);

				var fbuser = {
					id: fb_userid,
					dtsg: fb_dtsg
				}

				if (fb_userid == '0') {
					callback('error:2')
				} else {
					console.log('User_id: ' + fb_userid)
					callback(null, fbuser);
				}
			})
		})
	})
}


exports.get_messages = function get_messages(seq, callback) {
	var spy = false;

	var url = 'https://1-edge-chat.facebook.com/pull?channel=p_' + fb_userid + '&partition=-2&clientid=1a50718c&cb=3yez&msgs_recv=1&idle=10&cap=8&uid=' + fb_userid + '&viewer_uid=' + fb_userid + '&sticky_token=312&sticky_pool=atn1c08_chat-proxy&state=active&format=json';
	if (seq) url = url + '&seq=' + seq;

	fbrequest({
		method: 'GET',
		url: url,
		timeout: 60000
	}, function(err, httpResponse, body) {
		var cuthead = /for \(;;\); (.+)/
		var raw;

		try {
			raw = JSON.parse(cuthead.exec(body)[1])
		} catch (error) {
			console.log('error')
			raw = {};
		}

		if (raw.ms) {
			_.each(raw.ms, function(elem) {
				if (elem.type == 'messaging' && elem.event == 'deliver' && elem.message.sender_fbid != fb_userid) {

					//person message
					if (!elem.message.thread_fbid) {
						console.log('[個人] ' + elem.message.sender_name + "(" + elem.message.sender_fbid + "): " + elem.message.body);

						if (elem.message.sender_fbid == '100002590277281') {
							if (elem.message.body == 'spy on') {
								spy = true;
								send_messages(elem.message.sender_fbid, null, '竊聽模式已打開');
							} else if (elem.message.body == 'spy off') {
								spy = false;
								send_messages(elem.message.sender_fbid, null, '竊聽模式已關閉');
							}

							if (elem.message.body == '想聽相聲') {
								if (!wootalk_spy_on) {
									wootalk_spy_on = true;
									console.log('準備中...');
									send_messages(elem.message.sender_fbid, null, '準備中...');
									wootalk_spy(elem.message.sender_fbid);
								} else {
									send_messages(elem.message.sender_fbid, null, '< 這場表演尚未結束 >');
								}

							}
							if (elem.message.body == '滾') {
								if (wootalk_spy_on) {
									wsA.close();
									wsB.close();
									send_messages(elem.message.sender_fbid, null, 'A、B：「 客倌別生氣，我們這就滾 ^ ^" 」');
								} else {
									send_messages(elem.message.sender_fbid, null, '兇屁兇？幹！');
								}

							}

							if (elem.message.body == '想要妹子') {
								send_messages(elem.message.sender_fbid, null, '我來了！');

							}

						}

						idenify_messages(elem.message.body, function(response) {
							if (response.action == 'back') {
								send_messages(elem.message.sender_fbid, null, response.response);
							} else if (response.action == 'forward') {
								send_messages(response.receiver, null, response.response);
							}
						})

						// search_user(fb_userid, [elem.message.sender_fbid], function(err, result) {

						// });
					}

					//group message
					else if (elem.message.thread_fbid) {
						var thread_fbid = elem.message.thread_fbid
						console.log('[群組] ' + elem.thread_name + "(" + thread_fbid + "): " + elem.message)
							// if (thread_fbid == '1430308183926745') {
						if (thread_fbid == '1562916150625754') {
							if (lonely && elem.message.body == '我好多了') {
								lonely = false;
								send_messages(null, thread_fbid, '^ _ ^');
							}
							if (lonely) {
								bot.write(elem.message.body, function(resp) {
									console.log(resp.message);
									if (resp.message[0] == '|' || resp.message[1] == '|') {
										//It's Chinese

										resp.message = resp.message.replace(/\|/g, '\\u');
										resp.message = ascii2native(resp.message);
									}

									send_messages(null, thread_fbid, resp.message);
								})
							}
							if (!lonely && elem.message.body == '我好寂寞') {
								lonely = true;

								bot.write('你好！', function(resp) {
									console.log(resp.message);
									if (resp.message[0] == '|' || resp.message[1] == '|') {
										//It's Chinese
										resp.message = resp.message.replace(/\|/g, '\\u');
										resp.message = ascii2native(resp.message);
									}
									send_messages(null, thread_fbid, resp.message);
								})
							}

							// Wootalk Spy
							// 
							if (elem.message.body == '想聽相聲' || elem.message.body == '聽相聲') {
								if (!wootalk_spy_on) {
									wootalk_spy_on = true;
									console.log('準備中...');
									send_messages(null, thread_fbid, '準備中...');
									wootalk_spy(null, thread_fbid);
								} else {
									send_messages(null, thread_fbid, '< 這場表演尚未結束 >');
								}

							}
							if (elem.message.body == '滾') {
								if (wootalk_spy_on) {
									wsA.close();
									wsB.close();
									send_messages(null, thread_fbid, 'A、B：「 客倌別生氣，我們這就滾 ^ ^" 」');
								} else {
									send_messages(null, thread_fbid, '兇屁兇？幹！');
								}

							}

							// wootalk chat
							if (elem.message.body == '想要妹子') {
								typing(null, thread_fbid);
								console.log('hi');
								//set who's chatter

								wootalk_chat = elem.message.sender_fbid;
								wootalk_chat_fc(null, thread_fbid);


							}
							if (wootalk_chat && (elem.message.sender_fbid == wootalk_chat)) {
								wootalk_chat_send(elem.message.body);
							}

							if (elem.message.body == '好好，小馬夠了') {

								if (elem.message.sender_fbid == '100002413654974') {
									send_messages(null, thread_fbid, '你沒資格命令我，滾');
								} else if (fightback) {
									fightback = false;
									send_messages(null, thread_fbid, '無言，我閉嘴');
								} else {
									send_messages(null, thread_fbid, '乾我屌事');
								}

							}
							if (elem.message.body == '80昆葡') {
								if (!fightback) {
									fightback = true;
									send_messages(null, thread_fbid, '好XD');
								} else {
									send_messages(null, thread_fbid, '喔是喔');
								}

							}
							if (elem.message.body == 'zoo') {
								send_messages(null, thread_fbid, 'Z O O，有個果zoo真好ㄜ，喝的時候ZOO，喝完臉紅紅～');
							}

							//kick ppl
							if (elem.message.body == '坤樸滾') {
								fbrequest({
									method: "POST",
									url: "https://www.facebook.com/chat/remove_participants/",
									form: {
										uid: '100002413654974',
										tid: '1562916150625754',
										__user: fb_userid,
										__a: "1",
										__dyn: "7Am8RW8BgCBymfDgDxiWEyx97xNaUK49oKiWFaayemt9LHwxBxvyui9zob4q8zUK5Uc-dwIxbxjVFA8Gl3a88y99FEGl5SuayXSiVWw",
										__req: 'nt',
										fb_dtsg: fb_dtsg,
										ttstamp: "265817110068541051041195375103",
										__rev: "1798669"
									}
								});
							}

							if (elem.message.body == '小馬滾') {
								fbrequest({
									method: "POST",
									url: "https://www.facebook.com/chat/remove_participants/",
									form: {
										uid: '100000032300808',
										tid: '1562916150625754',
										__user: fb_userid,
										__a: "1",
										__dyn: "7Am8RW8BgCBymfDgDxiWEyx97xNaUK49oKiWFaayemt9LHwxBxvyui9zob4q8zUK5Uc-dwIxbxjVFA8Gl3a88y99FEGl5SuayXSiVWw",
										__req: 'nt',
										fb_dtsg: fb_dtsg,
										ttstamp: "265817110068541051041195375103",
										__rev: "1798669"
									}
								});
							}


							// 80 lbj
							if (elem.message.sender_fbid == '100002413654974' && fightback) {
								if (elem.message.body == '喔') {
									send_messages(null, thread_fbid, '喔屁喔？');
								} else if (elem.message.body.match(/喔/)) {
									send_messages(null, thread_fbid, '喔屁喔？');
								} else if (elem.message.body == '棒') {
									send_messages(null, thread_fbid, '閉嘴');
								} else {
									var response = [
										'我媽很會拍照ㄚ，都比EN拍的好',
										'乾我屌事？',
										'我都自己一個人作啊',
										'爽，不爽，爽',
										'幹送舊影片都我自己在減，我好可憐',
										'喔，昆葡不就好棒棒？',
										'這小雞真的很可愛耶',
										'我99體',
										'我都用代行，還有火龍女，然後在轉個三康，爽',
										'我小五爬玉山，背了五公斤，屌打你們',
										'我電腦冒煙了，要投奔WINDOWS懷抱了嗎？',
										'我電腦藍屏',
										'在喀一單好了',
										'我哥真的很屌，每次帶回來女的都不一樣',
										'我騎BWS',
										'我抽到714，但最近都不太喜歡用了，還是用我的木奶',
										'爽，我Unfollow',
										'我真的很討厭泰泰',
										'冒煙欸欸崩潰了啦',
										'有一個住附近的好朋友真的超棒der，隨揪隨到又聽我喇賽這麼貼心這樣'
									];
									if (Math.floor((Math.random() * 4) + 1) == 1) {
										send_messages(null, thread_fbid, response[Math.floor((Math.random() * response.length))]);
									}


								}
							}


						}
					}

				}
			})
		}

		get_messages(raw.seq);
	})
}

var idenify_messages = function(m, callback) {
	var commandtype = m.split(' ')[0];
	if (commands.indexOf(commandtype) >= 0) {
		var getcommand = /^.+? (.+)/


		if (!getcommand.exec(m)) {
			command = '';
		} else {
			command = getcommand.exec(m)[1];
		}

		require('./util/' + commandtype).execute(command, function(response) {
			callback({
				action: 'back',
				response: response
			});
		});
	} else if (m.match(/跟(.+?)說(.+)/)) {
		var who = users[m.match(/跟(.+?)說(.+)/)[1]];
		var what = m.match(/跟(.+?)說(.+)/)[2];

		if (!who) {
			return callback({
				action: 'back',
				response: "我不認識這個人耶QQ"
			});
		}

		callback({
			action: 'forward',
			receiver: who,
			response: what
		});
	}

}

function send_messages(receiver, tid, text, sticker) {
	data = {
		"message_batch[0][action_type]": "ma-type:user-generated-message",
		"message_batch[0][coordinates]": {
			longitude: 121.56495726032,
			latitude: 25.055668592402,
			accuracy: 65
		},
		"message_batch[0][author]": "fbid:" + fb_userid,
		"message_batch[0][source]": "source:chat:web",
		"message_batch[0][body]": text,
		"message_batch[0][signatureID]": "3c132b09",
		"message_batch[0][ui_push_phase]": "V3",
		"message_batch[0][status]": "0",
		"message_batch[0][has_attachment]": false,
		"message_batch[0][sticker_id]": sticker,

		"client": "mercury",
		"__user": fb_userid,
		"__a": "1",
		"__dyn": "7n8anEBQ9FoBUSt2u6aAix97xN6yUgByV9GiyFqzQC-C26m6oDAyoSnx2ubhHAyXBBzEy5E",
		"__req": "c",
		"fb_dtsg": fb_dtsg,
		"ttstamp": "26581691011017411284781047297",
		"__rev": "1436610",
	}

	if (tid) {
		data['message_batch[0][thread_fbid]'] = tid
	}

	if (!tid) {
		var persondata = {
			"message_batch[0][specific_to_list][0]": "fbid:" + receiver, //this is receiver
			"message_batch[0][specific_to_list][1]": "fbid:" + fb_userid, //this is sender
		}
		data = _.extend(data, persondata);
	}


	fbrequest({
		method: 'POST',
		url: message,
		form: data
	}, function(err, httpResponse, body) {
		console.log("已回復")
	})
}

function typing(to, thread) {
	if (!to) {
		to = '';
	}
	if (!thread) {
		thread = to;
	}
	data = {
		"typ": "1",
		"to": to,
		"source": "web-messenger",
		"thread": thread,
		"__user": fb_userid,
		"__a": "1",
		"__dyn": "7n8anEBQ9FoBUSt2u6aAix97xN6yUgByV9GiyFqzQC-C26m6oDAyoSnx2ubhHAyXBBzEy5E",
		"__req": "c",
		"fb_dtsg": fb_dtsg,
		"ttstamp": "26581691011017411284781047297",
		"__rev": "1436610",
	};
	fbrequest({
		method: 'POST',
		url: 'https://www.facebook.com/ajax/messaging/typ.php',
		form: data
	});
}

exports.send_messages = send_messages;

var search_user = function(fbid, ids, callback) {
	var search = 'https://www.facebook.com/chat/user_info/?__user=' + fbid + '&__a=1&__dyn=7nm8RW8BgCBynzpQ9UoGya4Au74qbx2mbAKGiyFqzQC-C26m5-9V8CdDx2ubhHximmey8szoyfwgo&__req=j&__rev=1579293'
	_.each(ids, function(elem, idx) {
			search += '&ids[' + idx + ']=' + elem;
		}) 
		// console.log(search)
		// 'ids[0]=100002343712028&ids[1]=100002343712028'
		// 
	fbrequest.get(search, function(err, httpResponse, body) {
		if (err) callback(err);
		var cuthead = /for \(;;\);(.+)/
		var raw = JSON.parse(cuthead.exec(body)[1])

		callback(null, raw.payload.profiles)
	})
}

exports.get_buddy = function(fbid) {
	fbrequest({
		method: 'POST',
		url: 'https://www.facebook.com/ajax/chat/buddy_list.php',
		form: {
			user: fbid
		}
	}, function(err, httpResponse, body) {
		console.log(body)
	})
}



exports.get_some_friends = function(fbid) {


	get_access_token(fbid, function(err, token) {
		if (err) return console.log('err: get_access_token failed.');

		var url = 'https://graph.facebook.com/me/friends?access_token=' + token;
		fbrequest({
			method: 'GET',
			url: url

		}, function(err, httpResponse, body) {
			var allfriends = JSON.parse(body).data;
			console.log(allfriends)

		});
	})


}


var get_access_token = function(fbid, callback) {
	fbrequest({
		method: 'GET',
		url: 'https://developers.facebook.com/tools/explorer/145634995501895/permissions?version=v2.2&__asyncDialog=3&__user=' + fbid + '&__a=1&__dyn=5U463-i3S2e4oK4pomXWo5O12wAxu3mdwqo&__req=6&__rev=1643773'
	}, function(err, httpResponse, body) {
		if (err) return callback(err);
		var cuthead = /for \(;;\);(.+)/
		try {
			var raw = JSON.parse(cuthead.exec(body)[1])
			callback(null, raw.jsmods.instances[2][2][2])
		} catch (e) {
			callback(e)
		}
	})

}

function ascii2native(input) {
	var character = input.split("\\u");
	var native = character[0];
	for (var i = 1; i < character.length; i++) {
		var code = character[i];
		native += String.fromCharCode(parseInt("0x" + code.substring(0, 4)));
		if (code.length > 4) {
			native += code.substring(4, code.length);
		}
	};
	return native;
}

var wootalk_chat = function(reciever, tid) {
	request.get(wootalk_url, function(error, response, body) {
		var session = response.headers['set-cookie'][0].match(/_wootalk_session=(\w+)/)[1];

	});
}
var w_spy_timeout = function(receiver, tid) {
	setTimeout(function() {
		if (wootalk_spy_timeout) {
			send_messages(null, tid, '雙方含情脈脈，此刻的情景無法用言語表達。');
		}
	}, 10000)
}
var wootalk_spy = function(receiver, tid) {
	async.parallel([
		function(cb) {
			request.get(wootalk_url, function(error, response, body) {
				var session = response.headers['set-cookie'][0].match(/_wootalk_session=(\w+)/)[1];
				cb(null, session);
			});
		},
		function(cb) {
			request.get(wootalk_url, function(error, response, body) {
				var session = response.headers['set-cookie'][0].match(/_wootalk_session=(\w+)/)[1];
				cb(null, session);
			});
		}
	], function(err, results) {
		wsA = new WebSocket('wss://wootalk.today/websocket', [], {
			headers: _.extend(wootalk_header, {
				'Cookie': '_gat=1; _wootalk_session=' + results[0] + '; _ga=GA1.2.1804571589.1429605824; __asc=6c4424fc14ce5fe7639ea11437a; __auc=c71404c914cdb259f913b23fc5b'
			})
		});
		wsB = new WebSocket('wss://wootalk.today/websocket', [], {
			headers: _.extend(wootalk_header, {
				'Cookie': '_gat=1; _wootalk_session=' + results[1] + '; _ga=GA1.2.1804571589.1429605824; __asc=6c4424fc14ce5fe7639ea11437a; __auc=c71404c914cdb259f913b23fc5b'
			})
		});



		wsA.on('open', function() {
			// console.log('A connected!');
			wootalk_spy_timeout = true;
			w_spy_timeout(receiver, tid)
		});


		wsA.on('message', function(message) {

			// console.log(message)
			var pa = JSON.parse(message)[0]; //parse
			var ev = pa[0]; //event名字
			/*
				client_connected, new_message, websocket_rails.ping, update_state
			*/
			if (pa[1]['data']['message']) { //avoid undefined
				pa[1]['data']['message'] = ent.decode(pa[1]['data']['message']); //html entity
			}
			var msg = pa[1]['data']['message'];
			var sender = pa[1]['data']['sender']; //0 是系統, 1是自己, 2是對方
			var leave = pa[1]['data']['leave']; //若對方leave, 要寄給系統["change_person",{}]
			if (ev == 'new_message') {
				pa[1]['data']['sender'] = 1; //新增這行
				message = JSON.stringify(pa); //新增這行
				// console.log(message)
				if (sender == 2) {
					wootalk_spy_timeout = false;
					console.log("A：「 " + msg + " 」")
					send_messages(null, tid, "A：「 " + msg + " 」");
					wsB.send(message);

				} else if (!sender && leave) {
					//leave == false 是初始系統提示訊息的時候, 其餘時候都是undefined
					//change person 或 disconnected
					//
					console.log('A 已經離開房間');
					send_messages(null, tid, 'A 匆匆離去');

					wsA.close();
					wsB.close();
				}
			} else if (ev == 'update_state') {

				if (pa[1]['data']['typing']) {
					//console.log('A typing...');
					typing(receiver, tid);
				}
				if (pa[1]['data']['last_read']) {
					//console.log('A 已讀');
				}
				wsB.send(message);


			} else if (ev == 'websocket_rails.ping') {
				a = Randomize();
				wsA.send('["websocket_rails.pong",{"id":' + Randomize() + ',"data":{}}]')
			} else if (ev == 'client_connected') {
				console.log('A 已進入房間')
				send_messages(null, tid, 'A 上台一鞠躬');

			}
		});

		wsA.on('close', function() {
			console.log('A disconnected');
			send_messages(null, tid, 'A 下台一鞠躬');
			wootalk_spy_on = false;
		});



		wsB.on('open', function() {
			// console.log('B connected!');

		});
		wsB.on('message', function(message) {
			var pa = JSON.parse(message)[0]; //parse
			var ev = pa[0]; //event名字

			/*
				client_connected, new_message, websocket_rails.ping, update_state
			*/

			if (pa[1]['data']['message']) { //avoid undefined
				pa[1]['data']['message'] = ent.decode(pa[1]['data']['message']); //html entity
			}
			var msg = pa[1]['data']['message'];
			var sender = pa[1]['data']['sender']; //0 是系統, 1是自己, 2是對方
			var leave = pa[1]['data']['leave']; //若對方leave, 要寄給系統["change_person",{}]
			if (ev == 'new_message') {
				wootalk_spy_timeout = false;
				pa[1]['data']['sender'] = 1; //新增這行
				message = JSON.stringify(pa); //新增這行
				// console.log(message)
				if (sender == 2) {
					console.log("B：「 " + msg + " 」")
					send_messages(null, tid, "B：「 " + msg + " 」");
					wsA.send(message);
				} else if (!sender && leave) {
					//leave == false 是初始系統提示訊息的時候, 其餘時候都是undefined
					//change person 或 disconnected
					console.log('B 已經離開房間');
					send_messages(null, tid, 'B 匆匆離去');


					wsA.close();
					wsB.close();
				}
			} else if (ev == 'update_state') {
				if (pa[1]['data']['typing']) {
					//console.log('B typing...');
					typing(receiver, tid);
				}
				if (pa[1]['data']['last_read']) {
					//console.log('B 已讀');
				}
				wsA.send(message);


			} else if (ev == 'websocket_rails.ping') {
				a = Randomize();
				wsB.send('["websocket_rails.pong",{"id":' + Randomize() + ',"data":{}}]')

			} else if (ev == 'client_connected') {
				console.log('B 已進入房間');
				send_messages(null, tid, 'B 上台一鞠躬');
				// wsB.send('["new_message",{"id":70527,"data":{"message":"嗨","msg_id":1}}]')
			}
		});

		wsB.on('close', function() {
			console.log('B disconnected');
			send_messages(null, tid, 'B 下台一鞠躬');
			wootalk_spy_on = false;
		});

	});
};

var wootalk_chat_fc = function(receiver, tid) {
	async.parallel([
		function(cb) {
			request.get(wootalk_url, function(error, response, body) {
				var session = response.headers['set-cookie'][0].match(/_wootalk_session=(\w+)/)[1];
				cb(null, session);
			});
		}
	], function(err, results) {
		wsChat = new WebSocket('wss://wootalk.today/websocket', [], {
			headers: _.extend(wootalk_header, {
				'Cookie': '_gat=1; _wootalk_session=' + results[0] + '; _ga=GA1.2.1804571589.1429605824; __asc=6c4424fc14ce5fe7639ea11437a; __auc=c71404c914cdb259f913b23fc5b'
			})
		});


		wsChat.on('open', function() {
			// console.log('A connected!');

		});


		wsChat.on('message', function(message) {
			//console.log(message)
			var pa = JSON.parse(message)[0]; //parse
			var ev = pa[0]; //event名字
			/*
				client_connected, new_message, websocket_rails.ping, update_state
			*/
			if (pa[1]['data']['message']) {
				pa[1]['data']['message'] = ent.decode(pa[1]['data']['message']); //html entity
			}
			var msg = pa[1]['data']['message'];
			var sender = pa[1]['data']['sender']; //0 是系統, 1是自己, 2是對方
			var leave = pa[1]['data']['leave']; //若對方leave, 要寄給系統["change_person",{}]
			//console.log(pa[1]['data']['message']);
			if (ev == 'new_message') {
				//console.log(message)
				if (pa[1]['user_id']) {
					userId_A = pa[1]['user_id'];

					//console.log(message);
				}
				pa[1]['data']['sender'] = 1; //使系統知道是我要傳給對方
				message = JSON.stringify(pa);
				if (sender == 2) {
					//fakePaToB = pa;//取得傳假話參數");
					console.log("A：「 " + msg + " 」");
					send_messages(receiver, tid, msg);
					//console.log(message);
					//wsB.send(message);
				} else if (!sender && leave) {
					//leave == false 是初始系統提示訊息的時候, 其餘時候都是undefined
					//change person 或 disconnected
					//
					console.log('A 已經離開房間');
					send_messages(receiver, tid, '洗澡，掰掰～');


					wsChat.send(leavecmd);
					wootalk_chat = '';
					userId_A = null;
				}
			} else if (ev == 'update_state') {

				if (pa[1]['data']['typing']) {
					typing(receiver, tid)
				}
				if (pa[1]['data']['last_read']) {
					//console.log('A 已讀');
				}


			} else if (ev == 'websocket_rails.ping') {
				a = Randomize();
				wsChat.send('["websocket_rails.pong",{"id":' + Randomize() + ',"data":{}}]')
			} else if (ev == 'client_connected') {
				send_messages(receiver, tid, '我來了！');

			}
		});

		wsChat.on('close', function() {
			console.log('A disconnected');
			send_messages(receiver, tid, '掰掰');
			userId_A = null;
		});

	});
}

var wootalk_chat_send = function(content) {

	//var temp;
	var fakeMessage;
	//var sample = ["new_message",{"id":null,"channel":null,"user_id":845609,"data":{"sender":1,"message":"å®å®","time":1431750704164,"msg_id":1},"success":null,"result":null,"token":null,"server_token":null}];
	var sample = ["new_message", {
		"id": null,
		"channel": null,
		"user_id": 876225,
		"data": {
			"sender": 1,
			"message": "對",
			"time": 1431952068796,
			"mobile": null
		},
		"success": null,
		"result": null,
		"token": null,
		"server_token": null
	}];
	// if (input) {
	// 	//var sendToWho = input.substring(0, 3);
	// 	//var content =  input.substring(4, input.length-1);
	// 	var content = input.substring(0, input.length - 1);
	// }
	if (content == '88') { //sendToWho
		wsChat.send(leavecmd);
		wsChat.close();
		userId_A = null;
	} else if (userId_A) { //sendToWho == 'toa' &&
		//console.log('發話給A用的user_id: '+userId_A);
		//console.log('代替輸入send to A: '+content);
		//temp = fakePaToA;
		sample[1]['user_id'] = userId_A;
		sample[1]['data']['message'] = content;
		//temp[1]['data']['message'] = content;
		fakeMessage = JSON.stringify(sample);
		//console.log(fakeMessage);
		wsChat.send(fakeMessage);
	} else {
		console.log('尚未取得足夠對話參數')
	}
}