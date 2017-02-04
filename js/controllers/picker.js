(function (window) {
var app = angular.module("rover-photos");

app.controller("picker", ["$scope", "nasaApiClient", function ($scope, api) {
	var ctrl = this;

	$scope.rovers = ["Curiosity", "Opportunity", "Spirit"];
	
	ctrl.getRoverDetails = function (rover) {
		return api.getManifest(rover).then(function (manifest) {
			console.log(manifest);
		});
	};
}]);

})(this);
