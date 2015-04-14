var app = angular.module('adminApp', []);
app.controller('adminCtrl', ['$scope', '$http', '$timeout', function($scope, $http, $timeout) {
	$http.get('/api/record/false').success(function(data) {
		$scope.records = data;
	});
}]);