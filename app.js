var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var async = require('async');
var _ = require('underscore');
var moment = require('moment-timezone');
var debug = require('debug')('pmr');

var routes = require('./routes/index');
var users = require('./routes/users');


var User = require('./models').user;
var Record = require('./models').record;


var fb = require('./utils/fb/fb');
var hooker = '1562916150625754';
// var hooker = '1430308183926745';


fb.login(function(err, fbuser) {
    if (err) {
        console.log(err)
    } else {
        var app = express();

        // view engine setup
        app.set('views', path.join(__dirname, 'views'));
        app.set('view engine', 'ejs');

        app.use(favicon());
        app.use(logger('dev'));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded());
        app.use(cookieParser());
        app.use(express.static(path.join(__dirname, 'public')));

        app.use('/', routes);

        app.get('/api/add/:id', function(req, res) {

            Record.find({
                user: req.params.id
            }).sort({
                createAt: -1
            }).exec(function(err, data) {
                if (data.length) {
                    var a = moment(data[0].createAt).valueOf();
                    var b = moment().valueOf();
                    if ((b - a) < 1000 * 60 * 2) {
                        fb.send_messages(null, hooker, req.query.name + '一直頻繁的被檢舉，是得罪誰了呢？ ლ(ಠ益ಠლ)')
                        return res.status(500).json({
                            msg: "cool down. wait " + (1000 * 60 * 2 - (b - a)) / 1000 + " seconds.",
                            cooldown: ((1000 * 60 * 2 - (b - a)) / 1000)
                        });
                    } else {
                        var newRec = new Record({
                            user: req.params.id,
                            reason: (req.query.reason || '沒有理由')

                        });
                        newRec.save(function(err, data) {
                            if (err) {
                                return res.status(404).json({
                                    msg: err
                                });
                            }

                            fb.send_messages(null, hooker, req.query.name + ' + 10,\n理由是 ' + (req.query.reason || '沒有理由') + '。\n大家一起恭喜他！( ͡° ͜ʖ ͡°)\n @http://ballchen.cc:5280')
                            res.json(data);
                        });
                    }
                } else {
                    var newRec = new Record({
                        user: req.params.id,
                        reason: (req.query.reason || '沒有理由')
                    });
                    newRec.save(function(err, data) {
                        if (err) {
                            return res.status(404).json({
                                msg: err
                            });
                        }

                        fb.send_messages(null, hooker, req.query.name + ' + 10,\n理由是 ' + (req.query.reason || '沒有理由') + '。\n大家一起恭喜他！( ͡° ͜ʖ ͡°)\n @http://ballchen.cc:5280')
                        res.json(data);
                    });
                }

            });


        });

        app.delete('/api/:id', function(req, res) {
            Record.remove({
                id: req.params.id
            }).exec(function(err, data) {
                if (err) {
                    return res.status(404).json({
                        msg: err
                    });
                }
                res.json(data);
            });
        });

        app.get('/api/user', function(req, res) {
            User.find().exec(function(err, data) {
                var finalresult = [];

                async.each(data, function(elem, callback) {
                    Record.find({
                        user: elem.id,
                        archive: false
                    }).sort({
                        createAt: -1
                    }).exec(function(err, result) {

                        var extra = (10 * result.length);
                        var cooldown = 0;

                        if (result.length) {

                            a = moment(result[0].createAt).valueOf();
                            var b = moment().valueOf();


                            if ((b - a) < 1000 * 60 * 2) {

                                cooldown = (1000 * 60 * 2 - (b - a));

                            } else {
                                cooldown = 0;
                            }
                        }



                        finalresult.push(_.extend(_.pick(elem, 'id', 'name', 'basic'), {
                            extra: extra,
                            all: (extra + elem.basic),
                            cooldown: Math.ceil(cooldown / 1000)
                        }));


                        callback();
                    });
                }, function(err2) {
                    if (err) {
                        return res.status(404).json({
                            msg: err
                        });
                    }
                    // console.log(finalresult);
                    res.json(_.sortBy(finalresult, 'all').reverse());
                });


            });
        });

        app.get('/api/record', function(req, res) {
            Record.find().sort({
                createAt: -1
            }).exec(function(err, data) {
                if (err) {
                    return res.status(404).json({
                        msg: err
                    });
                }
                var result = [];
                data.forEach(function(elem) {
                    result.push(_.extend(_.pick(elem, 'id', 'user', 'reason', 'archive'), {
                        createAt: moment(elem.createAt).tz('Asia/Taipei').calendar()
                    }));
                });
                console.log(result)
                result = _.groupBy(result, 'user');
                res.json(result);
            });
        });
        app.get('/api/record/false', function(req, res) {
            Record.find({
                archive: false
            }).sort({
                createAt: -1
            }).exec(function(err, data) {

                if (err) {
                    return res.status(404).json({
                        msg: err
                    });
                }
                var result = [];
                data.forEach(function(elem) {
                    result.push(_.extend(_.pick(elem, 'id', 'user', 'reason', 'archive'), {
                        createAt: moment(elem.createAt).tz('Asia/Taipei').calendar()
                    }));
                });
                async.each(result, function(record, callback) {
                    User.findOne({
                        id: record.user
                    }).exec(function(err, user) {
                        record.name = user.name;
                        callback()
                    });
                }, function(err) {
                    res.json(result);
                });


            });
        });

        app.get('/api/archive', function(req, res) {
            Record.aggregate([{
                $match: {
                    archive: false
                }
            }, {
                $group: {
                    _id: {
                        user: '$user'
                    },
                    sum: {
                        $sum: 10
                    }
                }
            }]).exec(function(err, data) {

                async.each(data, function(elem, callback) {
                    User.update({
                        id: elem._id.user
                    }, {
                        $inc: {
                            basic: elem.sum
                        }
                    }).exec(function(err, result) {
                        if (err) {
                            callback(err);
                        } else callback();
                    });
                }, function(err) {
                    Record.update({
                        archive: false
                    }, {
                        archive: true
                    }, {
                        multi: true
                    }).exec(function(err, result) {
                        if (err) {
                            return res.status(404).json({
                                msg: err
                            });
                        }
                        res.json(result);
                    });
                });
            });
        });



        /// catch 404 and forward to error handler
        app.use(function(req, res, next) {
            var err = new Error('Not Found');
            err.status = 404;
            next(err);
        });

        /// error handlers

        // development error handler
        // will print stacktrace
        if (app.get('env') === 'development') {
            app.use(function(err, req, res, next) {
                res.status(err.status || 500);
                res.render('error', {
                    message: err.message,
                    error: err
                });
            });
        }

        // production error handler
        // no stacktraces leaked to user
        app.use(function(err, req, res, next) {
            res.status(err.status || 500);
            res.render('error', {
                message: err.message,
                error: {}
            });
        });



        var server = app.listen(5280, function() {
            debug('Express server listening on port ' + server.address().port);
        });
        //stay online
        fb.pingpong(fbuser);
        //listen to messages
        // fb.get_messages();

        // fb.get_some_friends(fbuser.id);
        // fb.get_buddy(fbuser)
        // 

    }
})