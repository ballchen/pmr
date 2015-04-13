var Promise = require('bluebird');
var mongoose = require('mongoose');
Promise.promisifyAll(mongoose);
var autoIncrement = require('mongoose-auto-increment');
autoIncrement.initialize(mongoose);
var mongodb_uri = 'mongodb://127.0.0.1/pmr';

var userSchema = new mongoose.Schema({
    id: Number,
    name: {
        type: String,
        unique: true
    },
    createAt: {
        type: Date,
        default: Date.now
    },
    basic: Number
});

userSchema.plugin(autoIncrement.plugin, {
    model: 'user',
    field: 'id',
});


var recordSchema = new mongoose.Schema({
    id: Number,
    user: Number,
    archive: {
        type: Boolean,
        default: false
    },
    createAt: {
        type: Date,
        default: Date.now
    }
});

recordSchema.plugin(autoIncrement.plugin, {
    model: 'record',
    field: 'id',
});


var User = mongoose.model('user', userSchema);
var Record = mongoose.model('record', recordSchema);

mongoose.connect(mongodb_uri);


exports.user = User;
exports.record = Record;