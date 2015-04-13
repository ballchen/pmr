var User = require('../models').user;
// console.log(User)
var initquery = [{
	name: 'Ball',
	basic: 70
}, {
	name: 'LBJ',
	basic: 90
}, {
	name: 'Eg',
	basic: 60
}, {
	name: 'Ma',
	basic: 60
}, {
	name: 'Po',
	basic: 20
}, {
	name: 'C2',
	basic: 10
}];


initquery.forEach(function(elem, index, array) {
	var newuser = new User(elem)
	newuser.save(function(err, data) {
		console.log(err)
		console.log(data)
	});


});



/*
B--統計
Ball 70
Lbj 90
Eg 60
MA 60
Po 20
C2 10
 */