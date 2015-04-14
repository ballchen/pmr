var app = angular.module('adminApp', ['oitozero.ngSweetAlert']);
app.controller('adminCtrl', ['$scope', '$http', '$timeout', function($scope, $http, $timeout) {
	$http.get('/api/record/false').success(function(data) {
		$scope.records = data;
	});

	$scope.deleteRecord = function(record, idx) {
		$http.delete('/api/' + record.id).success(function(data) {
			$scope.records.splice(idx, 1);
		}).error(function(err) {
			swal('fail', 'no', 'error')
		})
	}

	$scope.archiveRecord = function() {
		$http.get('/api/archive').success(function(data) {
			swal('耶', '全清空', 'success')
			$scope.records = []
		}).error(function(err) {
			swal('fail', 'no', 'error')
		})
	}
}]);