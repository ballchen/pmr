var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
	res.render('index', {
		title: '放下屠刀，立地成佛'
	});
});

module.exports = router;