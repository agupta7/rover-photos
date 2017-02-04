(function (window) {
var app = angular.module("rover-photos");

app.controller("viewer", ["$scope", "$http", function ($scope, $http) {
	var ctrl = this;

	$scope.$on("photosFound", function ($event, photos, options) {
		$scope.photos = photos;
		$scope.photoOptions = options;
	});
}]);

})(this);
