(function (window) {
var app = angular.module("rover-photos", ["nasa-api", "util", "rzModule", "ui.bootstrap", "ngAnimate"]);

// Check DEBUG_MODE in the global window and set the local variable if true
var DEBUG_MODE = window && (window.DEBUG_MODE ||  window.name && ~window.name.indexOf("DEBUG_MODE"));
app.constant("DEBUG_MODE", DEBUG_MODE);
app.config(["$compileProvider", "$logProvider", "DEBUG_MODE", "$sceProvider", function ($compile, $log, DEBUG_MODE, $sce) {
	if (!DEBUG_MODE) {
		$compile.debugInfoEnabled(false);
		$log.debugEnabled(false);
		app.reloadWithDebugInfo = function () {
			window.name = 'DEBUG_MODE';
			window.location.reload();
		};
	} else
		$sce.enabled(false);
}]);
app.directive("lightgallery", function () {
	return {
		restrict: "A",
		link: function (scope, element, attrs) {
			if (scope.$last) {
				element.parent().lightGallery();
			}
		}
	}
});

app.run(["$rootScope", function ($rootScope) {
	$rootScope.carousel = [
		{img: "space1.jpg", quote: "It is difficult to say what is impossible, for the dream of yesterday is the hope of today and reality of tomorrow.", source: "Robert Goddard"},
		{img: "space2.jpg", quote: "For I dipped into the Future, far as human eye could see; saw the vision of the world, and all the wonder that would be.", source: "Alfred, Lord Tennyson"},
		{img: "space3.jpg", quote: "Man's mind and spirit grow with the space in which they are allowed to operate.", source: "Krafft A. Ehricke"}
	];
}]);
if (DEBUG_MODE && window)
	window.app = app;

})(this);
