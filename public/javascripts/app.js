var app = angular.module('myApp', ['oitozero.ngSweetAlert', 'timer']);
app.controller('indexCtrl', ['$scope', '$http', '$timeout', function($scope, $http, $timeout) {

	$http({
		method: 'GET',
		url: '/api/user'
	}).success(function(data) {
		$scope.users = data;
		$scope.users.forEach(function(elem) {
			elem.click = false;
		});
	}).error(function(data) {
		swal('唉呀', data.msg, 'error');
	});
	$scope.clickAdd = function() {

	}


	$scope.clickAddConfirm = function(user, idx) {
		console.log(document.getElementById('timerSec').getElementsByTagName('timer')[0].start());
		$http.get('/api/add/' + user.id).success(function(data) {
			user.extra += 10;
			$scope.users[idx].cooldown = 120;

			console.log(document.getElementById('timerSec').getElementsByTagName('timer'));
		}).error(function(data) {
			swal('唉呀', data.msg, 'error');
		});
	};

	$scope.countdownFin = function(cd, idx) {
		$scope.users[idx].cooldown = 0;

	};
}]);