(function (window) {
var app = angular.module("rover-photos");

app.controller("viewer", ["$scope", "$http", function ($scope,$http) {
	var ctrl = this;

	$scope.photos = [
	{
		 $http.get("https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol=1000&api_key=erNSHrzzSFQBQmNextmpYVSf3cDX2UVp4n9c4t3A")
    .then(function(response) {
        $scope.pictures = response.data.photos;
    });
	
}]);

})(this);
