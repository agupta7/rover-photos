(function (window) {
var app = angular.module("rover-photos");

app.controller("picker", ["$scope", function ($scope) {
	$scope.rovers = ["Curiosity", "Opportunity", "Spirit"];
	
}]);

})(this);
