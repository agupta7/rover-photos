(function (window) {
var app = angular.module("rover-photos", ["nasa-api", "util"]);

// Check DEBUG_MODE in the global window and set the local variable if true
var DEBUG_MODE = window && (window.DEBUG_MODE ||  window.name && ~window.name.indexOf("DEBUG_MODE"));
app.constant("DEBUG_MODE", DEBUG_MODE);
app.config(["$compileProvider", "$logProvider", "DEBUG_MODE", function ($compile, $log, DEBUG_MODE) {
	if (!DEBUG_MODE) {
		$compile.debugInfoEnabled(false);
		$log.debugEnabled(false);
		app.reloadWithDebugInfo = function () {
			window.name = 'DEBUG_MODE';
			window.location.reload();
		};
	}
}]);
if (DEBUG_MODE && window)
	window.app = app;

})(this);
