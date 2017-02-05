(function (window) {
var app = angular.module("rover-photos");

app.controller("viewer", ["$scope", "$http", "$q", "nasaApiClient", function ($scope, $http, $q, api) {
	var ctrl = this;

	var pendingPromises = [];

	$scope.vm = {
		dayType: "sol"
	};
	$scope.sliderOptions = {
		floor: 0,
		ceil: null,
		onChange: function () {
			var options = angular.extend($scope.photoOptions, {
				sol: $scope.photoOptions.sol
			});
			var promise = api.getPhotos(options);
			pendingPromises.push(promise);
			promise.then(function (photos) {
				$scope.photos = photos;
			}).finally(function () {
				pendingPromises.splice(pendingPromises.indexOf(promise), 1);
			});
		}
	};
	$scope.$on("photosFound", function ($event, photos, options) {
		$scope.photos = photos;
		$scope.photoOptions = options;
		$scope.sliderOptions.ceil = null;
		
		var promise = api.getManifest(options.rover);
		pendingPromises.push(promise);

		promise.then(function (manifest) {
			$scope.sliderOptions.ceil = manifest.max_sol;
			$scope.manifest = manifest;
		}).finally(function () {
			pendingPromises.splice(pendingPromises.indexOf(promise), 1);
		});
	});
}]);

})(this);
