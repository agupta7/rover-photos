angular.module("util", []).factory("util", ["$parse", function ($parse) {
	function descendIntoObject (string, obj, forEach) {
		var index = string.indexOf("[].");
		if (index == 0) {
			string = "this" + string;
			index = string.indexOf("[].");
		}
		if (index > 0) {
			var firstHalf = string.substr(0, index);
			var secondHalf = string.substr(index + 3);
			var arr = $parse(firstHalf)(obj);
			angular.forEach(arr, function (item) {
				descendIntoObject(secondHalf, item, forEach);
			});
		} else {
			var parsed = $parse(string);
			forEach(parsed, obj);
		}
	}

	return {
		descendIntoObject: descendIntoObject
	};
}]);

