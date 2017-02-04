(function (window) {
angular.module("nasa-api", [])
  .factory("nasaApiClient", ["$http", "$httpParamSerializer", function ($http, paramSerializer) {

	var apiKeys = ["erNSHrzzSFQBQmNextmpYVSf3cDX2UVp4n9c4t3A"];
	apiKeys.lastUsed = -1;

	return {
		getManifest: function (roverName) {
			return $http({
				method: "GET",
				url: getProxyUrl({
					url: "https://api.nasa.gov/mars-photos/api/v1/manifests/" + roverName.toLowerCase(),
					params: {
						api_key: nextAPIKey()
					}
				})
			}).then(dataTransformer);
		}
	};

	function nextAPIKey() {
		var keyIndex = (++apiKeys.lastUsed) % apiKeys.length;
		return apiKeys[keyIndex];
	}

	function dataTransformer(httpResponse) {
		return httpResponse.data;
	}

	function getProxyUrl(obj) {
		var url = obj.url;
		url += ~url.indexOf("?") ? "&" : "?" + paramSerializer(obj.params);
		return "http://172.17.44.107/index.php?" + paramSerializer({url: url});
	}
   }]);

})(this);
