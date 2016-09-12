(function() {
  'use strict';

  angular
    .module('d3', [])
    .factory('d3', ['$window', function($window) {
	  return $window.d3; // assumes d3 has already been loaded on the page
	}]);
})();
