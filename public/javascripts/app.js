var app = angular.module('myApp', []);
app.controller('indexCtrl', ['$scope', '$http', '$timeout', function($scope, $http, $timeout) {
	$http({
		method: 'GET',
		url: '/api/user'
	}).success(function(data) {
		$scope.users = data;
		$scope.users.forEach(function(elem) {
			elem.click = false;
		})
	}).error(function(data) {

	});

	$scope.clickAdd = function(user) {
		console.log(user)
		user.click = true;
		$timeout(function() {
			user.click = false;
		}, 2500);
	};
	$scope.clickAddConfirm = function(user) {
		user.click = false;
		$http.get('/api/add/' + user.id).success(function(data) {
			user.extra += 10;
		})
	};
}]);