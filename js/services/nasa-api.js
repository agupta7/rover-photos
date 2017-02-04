(function (window) {
angular.module("nasa-api", [])
  .factory("nasaApiClient", ["$http", "$httpParamSerializer", "$filter", "$q", "$sce", "util", function ($http, paramSerializer, $filter, $q, $sce, util) {

	var apiKeys = ["erNSHrzzSFQBQmNextmpYVSf3cDX2UVp4n9c4t3A"];
	var rovers = ["Curiosity", "Opportunity", "Spirit"];
	apiKeys.lastUsed = -1;

	return {
		getManifest: function (roverName) {
			return $http({
				method: "GET",
				url: getProxyUrl({
					url: "https://api.nasa.gov/mars-photos/api/v1/manifests/" + roverName.toLowerCase()
				})
			}).then(dataTransformer);
		},
		getPhotos: function (obj) {
			//obj.rover, obj.sol/earth_date, obj.camera, obj.page

			if (obj.rover) {
				return $http({
					method: "GET",
					url: getProxyUrl({
						url: "https://api.nasa.gov/mars-photos/api/v1/rovers/" + obj.rover.toLowerCase() + "/photos",
						params: {
							sol: !obj.earth_date && (obj.sol || 0),
//							earth_date: $filter("date")(obj.earth_date, "yyyy-mm-dd"),
							camera: obj.camera,
							page: obj.page
						}
					})
				}).then(function (httpResponse) {
					return httpResponse.data && httpResponse.data.photos || [];
				}).then(trustImageUrls);
			} else {
				return $q.all(eachRover({
					sol: !obj.earth_date && (obj.sol || 0),
//					earth_date: $filter("date")(obj.earth_date, "yyyy-mm-dd"),
					camera: obj.camera,
					page: obj.page
				})).then(function (promises) {
					var data = [];
					for (var i = 0; i < promises.length; i++)
						data = data.concat(promises[i].data && promises[i].data.photos || []);
					return data;
				}).then(trustImageUrls);
			}
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
		if (obj.params && Object.keys(obj.params).length) {
			url += ~url.indexOf("?") ? "&" : "?" + paramSerializer(obj.params);
		}
		return "http://172.17.44.107/index.php?" + paramSerializer({url: url});
	}

	function eachRover(obj) {
		var outPromises = [];
		for (var i = 0; i < rovers.length; i++) {
			outPromises.push($http({
				method: "GET",
				url: getProxyUrl({
					url: "https://api.nasa.gov/mars-photos/api/v1/rovers/" + rovers[i].toLowerCase() + "/photos",
					params: obj
				})
			}));
		}
		return outPromises;
	}

	function trustImageUrls(photos) {
		util.descendIntoObject("[].img_src", photos, function (parsed, obj) {
			var val = parsed(obj);
			parsed.assign(obj, $sce.trustAsUrl(val));
		});
		return photos;
	}
   }]);

})(this);
