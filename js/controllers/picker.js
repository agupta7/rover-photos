(function (window) {
var app = angular.module("rover-photos");

app.controller("picker", ["$scope", "nasaApiClient", function ($scope, api) {
	var ctrl = this;

	$scope.rovers = {
		"Curiosity": ["FHAZ", "RHAZ", "MAST", "CHEMCAM", "MAHLI", "MARDI", "NAVCAM"],
		"Spirit": ["FHAZ", "RHAZ", "NAVCAM", "PANCAM", "MINITES"],
		"Opportunity": ["FHAZ", "RHAZ", "NAVCAM", "PANCAM", "MINITES"]
	};
	$scope.cameras = [
		{"FHAZ": "Front Hazard Avoidance Camera"},
		{"RHAZ": "Rear Hazard Avoidance Camera"},
		{"MAST": "Mast Camera"},
		{"CHEMCAM": "Chemistry and Camera Complex"},
		{"MAHLI": "Mars Hand Lens Imager"},
		{"MARDI": "Mars Descent Imager"},
		{"NAVCAM": "Navigation Camera"},
		{"PANCAM": "Panoramic Camera"},
		{"MINITES": "Miniature Thermal Emission Spectrometer"}
	];
	
	ctrl.getRoverDetails = function (rover) {
		/*return api.getManifest(rover).then(function (manifest) {
			console.log(manifest.photo_manifest);
		});*/
	};

	ctrl.searchPhotos = function (rover, camera) {
		var options = {
			rover: rover,
			sol: 0,
			camera: camera
		};
		return api.getPhotos(options).then(function (photos) {
			$scope.$root.$broadcast("photosFound", photos, options);
		});
	};
}]);

})(this);
