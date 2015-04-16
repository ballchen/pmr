var User = require('../models').user;
// console.log(User)
var initquery = [{
	name: 'TSA',
	basic: 0
}, {
	name: 'EN',
	basic: 0
}, {
	name: 'Tien',
	basic: 0
}];


initquery.forEach(function(elem, index, array) {
	var newuser = new User(elem)
	newuser.save(function(err, data) {
		console.log(err)
		console.log(data)
	});


});