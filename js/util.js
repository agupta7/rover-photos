var ng = require("angular");
var utilModule = angular.module("cb-util", []);
utilModule.factory("$RESTClientConstructor", ["$http", "$q", "$timeout", "$cacheFactory", "$log", "util.functions", "ErrorHandler", "RESTClientPromise", "$rootScope", function ($http, $q, $timeout, $cacheFactory, $log, util, ErrorHandler, RESTClientPromise, $rootScope) {
	ng.extend($RESTClientConstructor.prototype, {
		$getSafeConfig: function $getSafeConfig(unsafeConfig) {
			unsafeConfig = ng.isObject(unsafeConfig) ? unsafeConfig : {};
			var commonMethods = util.makeMap("GET", "PUT", "POST", "DELETE");
			unsafeConfig.method = ng.isString(unsafeConfig.method) && unsafeConfig.method ? unsafeConfig.method.toUpperCase() : "GET";
			if (!commonMethods[unsafeConfig.method])
				$log.debug("WARNING: " + unsafeConfig.method + " is not a commonly used RESTful method.");

			if (!util.isPlainObject(unsafeConfig.params))
				unsafeConfig.params = {};

			if (!unsafeConfig.tag || !ng.isString(unsafeConfig.tag))
				unsafeConfig.tag = !unsafeConfig.managedCallsGlobal && unsafeConfig.url || "_";

			if (typeof unsafeConfig.timeout === "number" && unsafeConfig.timeout) {
				var milliseconds = unsafeConfig.timeout;
				unsafeConfig.timeout = $timeout(np.noop, milliseconds);
				unsafeConfig.timeout.$$milliseconds = milliseconds;
			} else
				unsafeConfig.timeout = 0;

			if (!util.makeMap("function", "number")[typeof unsafeConfig.retry])
				unsafeConfig.retry = 0;
			else if (typeof unsafeConfig.retry === "number")
				unsafeConfig.retry = parseInt(unsafeConfig.retry);
			if (!unsafeConfig.errorHandler)
				unsafeConfig.errorHandler = new ErrorHandler();

			unsafeConfig.domainErrorDetectors = ng.isArray(unsafeConfig.domainErrorDetectors) ? unsafeConfig.domainErrorDetectors : [];
			if (unsafeConfig.domainErrorDetector)
				unsafeConfig.domainErrorDetectors.push(unsafeConfig.domainErrorDetector);
			return unsafeConfig;
		},
		$extractHTTPConfig: function $extractHTTPConfig(safeConfig) {
			var config = ng.copy(safeConfig);
			var exclude = ["domainErrorDetectors", "domainErrorDetector", "errorHandler", "managedCalls", "maangedCallsGlobal", "timeout", "tag", "retry"];
			if (config.method === "GET")
				exclude.push("data");
			exclude = util.makeMap(exclude);
			for (var key in config) {
				if (exclude[key])
					delete config[key];
			}
			return config;
		},
		$$httpParamSerializer: function $$httpParamSerializer(params) {
			if (!params)
				return '';
			var parts = [];
			function sortedKeys(obj) {
				return Object.keys(obj).sort();
			}
			function serializeValue(v) {
				if (ng.isObject(v)) {
					return ng.isDate(v) ? v.toISOString() : ng.toJson(v)
				}
				return v;
			}
			function forEachSorted(obj, iterator, context) {
				var keys = sortedKeys(obj);
				for (var i = 0; i < keys.length; i++) {
					iterator.call(context, obj[keys[i]], keys[i]);
				}
			}
			function encodeUriQuery(val, pctEncodeSpaces) {
				return encodeURIComponent(val).
						replace(/%40/gi, "@").
						replace(/%3A/gi, ":").
						replace(/%24/g, "$").
						replace(/%2C/gi, ",").
						replace(/%3B/gi, ";").
						replace(/%20/g, (pctEncodeSpaces ? "%20" : "+"));
			}
         forEachSorted(params, function (value, key) {
				if (value === null || ng.isUndefined(value))
					return;
				if (!ng.isArray(value))
					value = [value];
				ng.forEach(vaule, function (v, k) {
					parts.push(encodeUriQuery(key) + "=" + encodeUriQuery(serializeValue(v)));
				});
			});
			return parts.join("&");
		},
		$buildUrl: function $buildUrl(url, params, serializer) {
			if (!serializer)
				serializer = this.$$httpParamSerializer;
			var serialized = params && serializer(params) || null;
			if (serialized)
				url = ~url.indexOf("?") ? "&" : "?" + serialized;
			return url;
		},
		$$detectError: function $$detectError(restCallObj, httpResponse) {
			if (restCallObj.$$rejectResponse) {
				$log.debug("Reject response for call.  Logging response:");
				$log.debug(httpResponse);
				return httpResponse; // return the response so the stack doesn't think it's a call error and invoke retrying/error handling mechanisms
			}
			var statusCode = parseInt(httpResponse.status);
			if (restCallObj.$httpConfig.timeout && restCallObj.$httpConfig.timeout.$$state.status == 1) {
				httpResponse.reason = (restCallObj.$config.timeout && restCallObj.$config.timeout.$$state.status == 1) ? "timeout" : "cancel";
			} else if (!statusCode || statusCode <= 0) {
				httpResponse.reason = "network";
			} else if (statusCode >= 400)
				httpResponse.reason = "server";

			// reaching here some response came back. it might be a
			// server error, a data error, a domain-specific error,
			// or completely successful
			var isDataError;
			for (var i = 0; i < restCallObj.domainErrorDetectors.length; i++) {
				isDataError = restCallObj.domainErrorDetectors[i](httpResponse);
				if (isDataError)
					break;
			}
			if (isDataError) {
				httpResponse.reason = (typeof isDataError === "string") ? isDataError : "domain";
			}
			if (httpResponse.reason) {
				if (httpResponse.config.cache && util.makeMap("GET", "JSONP")[httpResponse.config.method.toUpperCase()])
					httpResponse.config.cache.remove(this.$buildUrl(httpResponse.config.url, httpResponse.config.params, httpResponse.config.paramSerializer));
				return $q.reject(httpResponse);
			}
			return httpResponse;
		},
		$errorDetectingCall: function $errorDetectingCall(restCallObj) {
	      var restClientInstance = this;
	      var callDefer = $q.defer();
	      var callPromise = callDefer.promise;
	      $rootScope.$evalAsync(function () {
	        var $httpConfig = restCallObj.$httpConfig;
			  if (restCallObj.$isNoCache) {
				  $httpConfig.cache = false;
			  }
			  if (restCallObj.$isRefreshCache && $httpConfig.cache !== false && util.makeMap("GET", "JSONP")[$httpConfig.method.toUpperCase()]) {
					function isCacheObj(o) {
					  return o && ng.isFunction(o.put) && ng.isFunction(o.get);
					}
					var cacheObj = isCacheObj($httpConfig.cache) ? $httpConfig.cache :
							isCacheObj($http.defaults.cache) ? $http.defaults.cache : $cacheFactory.get("$http");
					cacheObj.remove(restClientInstance.$buildUrl($httpConfig.url, $httpConfig.params,
										$httpConfig.paramSerializer ? (ng.isString($httpConfig.paramSerializer) && $injector.get($httpConfig.paramSerializer) || $http.defaults.paramSerializer) : null));
			  }
			  var promise = $http($httpConfig);
			  var detectError = restClientInstance.$$detectError.bind(restClientInstance, restCallObj);
			  promise.then(detectError, detectError).then(callDefer.resolve, callDefer.reject);
	      });
			return callPromise;
   	},
		$managedCall: function $managedCall(restCallObj) {
			var config = restCallObj.$config;
			var lastCall = util.last(this.$$pendingCallsPerTag[config.tag]).$qPromise;
			if (config.managedCalls === this.$MANAGED_CALL_SINGLE) {
				return lastCall.then(this.$errorDetectingCall.bind(this, restCallObj), this.$errorDetectingCall.bind(this, restCallObj));
			} else if (config.managedCalls === this.$MANAGED_CALL_QUEUED_RETURN) {
				return this.$errorDetectingCall(restCallObj).finally(function () {
					return lastCall.then(ng.identity, ng.identity); // make the lastCall always seem to succeed so that this promise doesn't fail
				});
			} else if (config.managedCalls === this.$MANAGED_CALL_IGNORE) {
				return util.lastItem(this.$$pendingCallsPerTag[config.tag]);
			} else if (config.managedCalls === this.$MANAGED_CALL_CANCEL) {
				ng.forEach(this.$$pendingCallsPerTag[config.tag], function (call) {
					call.cancel();
				});
				return this.$errorDetectingCall(restCallObj);
			} else if (config.managedCalls === this.$MANAGED_CALL_REJECT_RESPONSE) {
				ng.forEach(this.$$pendingCallsPerTag[config.tag], function (call) {
					call.rejectResponse();
				});
				return this.$errorDetectingCall(restCallObj);
			}
		},
		$generateRandomCache: function $generateRandomCache(capacity) {
			function random() {
				return parseInt(Math.random() * 1000).toString();
			}
			var id;
			do {
				id = random();
			} while ($cacheFactory.get(id));
			if (capacity)
				return $cacheFactory(id, {
					capacity: capacity
				});
			else
				return $cacheFactory(id);
		},
		$retryingHttpErrorHandler: function $retryingHttpErrorHandler(restCallObj, error) {
			var restClientInstance = this;
			var shouldRetry;
			error.retriesDone = restCallObj.$config.retriesDone || 0;
			if (error.reason !== "cancel" && (shouldRetry = ng.isFunction(restCallObj.$config.retry) ? restCallObj.$config.retry(error, error.retriesDone) : restCallObj.$config.retry && restCallObj.$config.retry--)) {
				restCallObj.$deferred.notify(error);
				restCallObj.$config.retriesDone++;
				if (shouldRetry.then) {
					return shouldRetry.then(this.$errorDetectingCall.bind(this, restCallObj)).then(null, this.$retryingHttpErrorHandler.bind(this, restCallObj));
				} else if (ng.isFunction(restCallObj.$config.retry) && ng.isNumber(shouldRetry)) {
					return $timeout(ng.noop, shouldRetry).then(this.$errorDetectingCall.bind(this, restCallObj)).then(null, this.$retryingHttpErrorHandler.bind(this, restCallObj));
				} else {
					return this.$errorDetectingCall(restCallObj).then(null, this.$retryingHttpErrorHandler.bind(this, restCallObj));
				}
			}
			try {
				error.resendCall = function () {
					error.retriesDone = restCallObj.$config.retriesDone && ++restCallObj.$config.retriesDone || (restCallObj.$config.retriesDone = 1);
					return restClientInstance.$errorDetectingCall(restCallObj).then(null, restClientInstance.$retryingHttpErrorHandler.bind(this, restCallObj));
				};
				var handled = restCallObj.$config.errorHandler.handle(error);
			} catch (e) {
				var handled = null;
				$log.debug("User defined error handler threw an exception: ");
				$log.debug(e);
			}
			if (!handled) {
				$log.debug("REST client request failed: ");
				$log.debug(error);
				return $q.reject(error);
			} else {
				return handled; // may be the response or the promise;
			}
		},
		$$method: function (fn, method, isDataLessCall, url, data, config) {
			var _config = ng.extend({}, isDataLessCall ? data : config, {
				url: url,
				method: method
			});
			if (!isDataLessCall && data)
				_config.data = data;
			return fn(_config);
		},
		$createShortcutMethods: function $createShortcutMethods(callFn) {
			var restClientInstance = this;
			ng.forEach(this.$DATALESS_METHODS, function (method) {
				callFn[method.toLowerCase()] = restClientInstance.$$method.bind(restClientInstance, callFn, method, true);
			});
			ng.forEach(this.$DATA_METHODS, function (method) {
				callFn[method.toLowerCase()] = restClientInstance.$$method.bind(restClientInstance, callFn, method, false);
			});
		},
		$DATALESS_METHODS: ["GET", "DELETE", "HEAD", "JSONP"],
		$DATA_METHODS: ["POST", "PUT", "PATCH"],
		$MANAGED_CALL_CANCEL: "cancel",
		$MANAGED_CALL_REJECT_RESPONSE: "rejectResponse",
		$MANAGED_CALL_QUEUED_RETURN: "queuedReturn",
		$MANAGED_CALL_SINGLE: "single",
		$MANAGED_CALL_IGNORE: "ignore",
		newExtend: function newExtend(unsafeConfig) {
			var c = ng.extend(this.instanceConfig, unsafeConfig);
			return new $RESTClientConstructor(c);
		},
		new: function (unsafeConfig) {
			return new $RESTClientConstructor(unsafeConfig);
		},
		cancelPending: function cancelPending() {
			ng.forEach(this.$$pendingCallsPerTag, function (tagCalls) {
				ng.forEach(tagCalls, function (call) {
					call.cancel();
				});
			});
			return this;
		},
		rejectPending: function rejectPending() {
			ng.forEach(this.$$pendingCallsPerTag, function (tagCalls) {
				ng.forEach(tagCalls, function (call) {
					call.rejectResponse();
				});
			});
			return this;
		},
		destroy: function destroy() {
			this.cancelPending();
			if (this.instanceConfig.cache) {
				this.instanceConfig.cache.destroy();
			}
			return this;
		}
	});
	return $RESTClientConstructor;

	function $RESTClientConstructor(unsafeConfig) {
		var instance = this;
		var boundInstance = restClientInvocation.bind(this);

		boundInstance.$instance = this;
		instance.instanceConfig = unsafeConfig;
		instance.pendingCalls = 0;
		instance.$$pendingCallsPerTag = {};

		if (typeof instance.instanceConfig.cache === "number") {
			instance.instanceConfig.cache = this.$generateRandomCache(parseInt(instance.instanceConfig.cache));
		} else if (instance.instanceConfig.cache === true) {
			instance.instanceConfig.cache = this.$generateRandomCache();
		}
		if (instance.instanceConfig.domainErrorDetectors && !ng.isArray(instance.instanceConfig.domainErrorDetectors))
			instance.instanceConfig.domainErrorDetectors = [instance.instanceConfig.domainErrorDetectors];

		ng.forEach($RESTClientConstructor.prototype, function (prop, fnName) {
			if (typeof prop === "function") {
				boundInstance[fnName] = prop.bind(instance);
			}
		});
		instance.$createShortcutMethods(boundInstance);
		return boundInstance;
	}

	function restClientInstanceInvocation(_config) {
		var instance = this;

		var config = this.$getSafeConfig(ng.extend({
			method: "GET"
		}, this.instanceConfig, _config));
		var $httpConfig = this.$extractHTTPConfig(config);
		if (config.method === "GET")
			$httpConfig.params = ng.extend({}, $httpConfig.params, config.data);

		var restCallObj = new RESTClientPromise();
		restCallObj.$config = config;
		restCallObj.$httpConfig = $httpConfig;
		restCallObj.$canceller = $q.defer();
		restCallObj.$responseRejector = function $responseRejector() {
			restCallObj.$deferred.reject({
				reason: instance.$MANAGED_CALL_REJECT_RESPONSE
			});
		};
		$httpConfig.timeout = restCallObj.$canceller.promise;

		if (util.makeMap(instance.$MANAGED_CALL_CANCEL, instance.$MANAGED_CALL_REJECT_RESPONSE, instance.$MANAGED_CALL_QUEUED_RETURN, instance.$MANAGED_CALL_SINGLE, instance.$MANAGED_CALL_IGNORE)[config.managedCalls] && util.lastItem(this.$$pendingCallsPerTag[config.tag])) {
			this.$managedCall(restCallObj).then(null, this.$retryingHttpErrorHandler.bind(this, restCallObj)).then(restCallObj.$deferred.resolve, restCallObj.$deferred.reject);
		} else {
			this.$errorDetectingCall(restCallObj).then(null, this.$retryingHttpErrorHandler.bind(this, restCallObj)).then(restCallObj.$deferred.resolve, restCallObj.$deferred.reject);
		}

		restCallObj.finally(function () {
			instance.pendingCalls--;
			util.removeFromArray(instance.$$pendingCallsPerTag[config.tag], restCallObj);
		});
		instance.pendingCalls++;
		if (!instance.$$pendingCallPerTag[config.tag])
			instance.$$pendingCallsPerTag[config.tag] = [];
		instance.$$pendingCallsPerTag[config.tag].push(restCallObj);
		if (config.timeout)
			config.timeout.then(restCallObj.cancel);
		return restCallObj;
	}
}]);
utilModule.service("util.functions", ["$parse", function ($parse) {
	var service = this;
	function differentiateArrays(arr1, arr2, trackBy) {
		var trackedArr1, trackedArr2;
		if (angular.isString(trackBy)) {
			trackedArr1 = arr1.map(function (item) {
				return $parse(trackBy)(item);
			});
			trackedArr2 = arr2.map(function (item) {
				return $parse(trackBy)(item);
			});
		}

		var added = arr2.filter(function (item) {
			if (trackedArr1)
				return trackedArr1.indexOf($parse(trackBy)(item)) < 0;
			else
				return arr1.indexOf(item) < 0;
		});
		var removed = arr1.filter(function (item) {
			if (trackedArr2)
				return trackedArr2.indexOf($parse(trackBy)(item)) < 0;
			else
				return arr2.indexOf(item) < 0;
		});
		var common = arr1.filter(function (item) {
			if (trackedArr2)
				return trackedArr2.indexOf($parse(trackBy)(item)) > -1;
			else
				return arr2.indexOf(item) > -1;
		});
		return {
			added: added,
			removed: removed,
			common: common
		};
	}
	function deleteFromArray(arr, item, trackByKey) {
		var index;
		var removeCount = 0;
		var trackedArr = trackByKey ? arr.map(function (e) {
			return e[trackByKey];
		}) : arr;
		while ((index = trackedArr.indexOf(trackByKey ? item[trackByKey] : item)) > -1) {
			if (trackByKey)
				trackedArr.splice(index, 1);
			arr.splice(index, 1);
			removeCount++;
		}
		return removeCount;
	}
	function uniqueArray(arr, trackByKey) {
		if (!angular.isArray)
			throw new Error("Must pass an array");
		var trackedMap = {};
		return arr.filter(function (item, index, array) {
			if (trackByKey) {
				var trackItem = $parse(trackByKey)(item);
				var exists = angular.toJson(trackItem) in trackedMap;
				if (!exists)
					trackedMap[angular.toJson(trackItem)] = null;
				return !exists;
			} else {
				return array.slice(0, index).indexOf(item) < 0; // include the item if it doesn't occur previously in the array
			}
		});
	}
	function makeMap() {
		var map = {};
		angular.forEach(arguments, function (arg) {
			if (typeof arg == "string")
				map[arg] = true;
		});
		return map;
	}
	function asString(obj) {
		if (obj === undefined)
			return "undefined";
		else if (obj === null)
			return "null";
		else if (typeof obj in makeMap("number", "boolean", "string"))
			return obj	+ "";
		else if (angular.isArray(obj))
			return obj.map(function (o) {
				return asString(o);
			}).join(", ");
		else if (angular.isObject(obj))
			return obj.toString();
		else if (angular.isFunction(obj))
			return obj.toString();
		else
			return null; // should never reach this case since this function guarantees a return type of "String".	I have it here since returning null should throw an error.
	}
	function scrollLocation(element) {
		var element = element instanceof HTMLElement && element || element[0];
		var location = 0;
		if (element.offsetParent) {
			do {
				location += element.offsetTop;
				element = element.offsetParent;
			} while (element);
		}
		var offset = 0; // temporary
		location = Math.max(location - offset, 0);
		return location;
	}

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

	function removeFromArrays(arrs) {
		if (arguments.length <= 1)
			return arrs;

		arrs = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
		var item = arguments[arguments.length - 1];
		var removeCount = 0;
		for (var i = 0; i < arrs.length; i++) {
			var arr = arrs[i];
			deleteFromArray(arr, item) && ++removeCount;
		}
		return removeCount;
	}

	service.differentiateArrays = differentiateArrays;
	service.uniqueArray = uniqueArray;
	service.makeMap = makeMap;
	service.asString = asString;
	service.scrollLocation = scrollLocation;
	service.isPlainObject = function (obj) {
		var hasOwn = Object.hasOwnProperty;
		if (!(obj instanceof Object))
			return false;
		if (!hasOwn.call(obj, "constructor") && !hasOwn.call(obj.constructor.prototype, "isPrototypeOf"))
			return false;
		return true;
	};
	service.descendIntoObject = descendIntoObject;
	service.urlToParams = function urlToParams(url) {
		var params = {};
		var queryStringRegex = /\?(.*)$/;
		var match = queryStringRegex.exec(url);

		var queryString = match && match[1] || "";
		var parts = queryString.split("&");

		for (var i = 0; i < parts.length; i++) {
			var pieces = parts[i].split("=");
			var key = decodeURIComponent(pieces[0]);
			var value = decodeURIComponent(pieces[1]);
			params[key] = val;
		}
		return params;
	};
	service.removeFromArray = service.removeFromArrays = removeFromArrays;
	service.strReverse = function strReverse(str) {
		var out = "";
		for (var i = str.length - 1; i >= 0; i--)
			out += str[i];
		return out;
	};
	service.lastItem = function lastItem(arr) {
		if (ng.isArray(arr) && arr.length)
			return arr[arr.length - 1];
		return null;
	};
}]);

module.exports = utilModule;
