(function (window) {
var app = angular.module("rover-photos");

app.controller("picker", ["$scope", "nasaApiClient", function ($scope, api) {
	var ctrl = this;

	$scope.rovers = ["Curiosity", "Opportunity", "Spirit"];
	$scope.cameras = [
		{abbr: "FHAZ", camera: "Front Hazard Avoidance Camera"},
		{abbr: "RHAZ", camera: "Rear Hazard Avoidance Camera"},
		{abbr: "MAST", camera: "Mast Camera"},
		{abbr: "CHEMCAM", camera: "Chemistry and Camera Complex"},
		{abbr: "MAHLI", camera: "Mars Hand Lens Imager"},
		{abbr: "MARDI", camera: "Mars Descent Imager"},
		{abbr: "NAVCAM", camera: "Navigation Camera"},
		{abbr: "PANCAM", camera: "Panoramic Camera"},
		{abbr: "MINITES", camera: "Miniature Thermal Emission Spectrometer (Mini-TES)"}
	];
	
	ctrl.getRoverDetails = function (rover) {
		return api.getManifest(rover).then(function (manifest) {
			console.log(manifest.photo_manifest);
		});
	};
}]);

})(this);
