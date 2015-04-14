var app = angular.module('myApp', ['oitozero.ngSweetAlert', 'timer']);
app.controller('indexCtrl', ['$scope', '$http', '$timeout', '$interval', function($scope, $http, $timeout, $interval) {
	$http({
		method: 'GET',
		url: '/api/user'
	}).success(function(data) {
		$scope.users = data;
		$scope.users.forEach(function(elem) {
			elem.click = false;
			elem.image = '/images/' + elem.name + '.png';
		});
	}).error(function(data) {
		swal('唉呀', data.msg, 'error');
	});
	$scope.clickAdd = function(user, idx) {
		$scope.reason = "";
		$scope.userModal = {};
		$scope.userModal.user = user;
		$scope.userModal.idx = idx;
	};


	$scope.clickAddConfirm = function(user, idx) {
		$http.get('/api/add/' + user.id + '?reason=' + $scope.reason).success(function(data) {
			user.extra += 10;
			$scope.users[idx].cooldown = 120;
			swal('太糟了', $scope.reason, 'success');
			$('#myModal').modal('hide');


		}).error(function(data) {
			swal('唉呀', data.msg, 'error');
			$('#myModal').modal('hide');
		});
	};

	$scope.countdownFin = function(cd, idx) {
		$scope.users[idx].cooldown = 0;

	};

	$scope.PlusD = function(idx) {
		$scope.users[idx].image = '/images/' + $scope.users[idx].name + 'd.png'
	};

	var calcooldown = function() {
		$scope.users.forEach(function(elem, idx) {
			if (elem.cooldown > 0) {
				elem.cooldown -= 1;
			}
		});
	};


	countdown = $interval(calcooldown, 1000);
}]);