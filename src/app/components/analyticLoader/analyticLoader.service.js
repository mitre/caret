(function() {
  'use strict';

  angular
    .module('caret')
    .factory('analyticLoader', analyticLoader);

  /** @ngInject */
  function analyticLoader($log, $http, $window, _) {
    var service = {
      getAnalytics: getAnalytics,
      getTechniques: getTechniques,
      getGroups: getGroups,
      buildCORSQueryString: buildCORSQueryString,
      buildJSONPQueryString: buildJSONPQueryString,
      getAttackFromCar: getAttackFromCar,
      getSensors: getSensors,
      getDataModel: getDataModel
    };

    return service;

    function getAnalytics(host) {
      return $http.jsonp(buildJSONPQueryString(host, '[[Is ATTACK Reference For::+]]', 
        ['Has ATTACK Tactic', 'Has ATTACK Coverage', 'Has ATTACK Technique ID']), {cache: true})
        .then(getAnalyticsComplete)
        .catch(errorFunction('XHR Failed for getAnalytics.\n'));

      function getAnalyticsComplete(response) {
        var results = [];
        angular.forEach(response.data.query.results, function (value, key) {
          var name = key.split("#")[0];
          var analytic = _.find(results, {name: name});
          if (analytic === undefined){
            // create new analytic
            analytic = {name: name, attack: [], instantiations: []};
            results.push(analytic);
          }
          
          var tactics = value.printouts['Has ATTACK Tactic']; // array
          var coverage = value.printouts['Has ATTACK Coverage'][0]; // string
          if (coverage.toLowerCase() === "partial" || coverage.toLowerCase() === "moderate") {
            coverage = "Partial";
          } else if (coverage.toLowerCase() === "high" || coverage.toLowerCase() === "complete") {
            coverage = "Complete";
          } else {
            coverage = "";
          }
          var technique = 'Technique/' + value.printouts['Has ATTACK Technique ID'][0]; // string
          analytic.attack.push({tactics: tactics, coverage: coverage, technique: technique});
        });
 
        return $http.jsonp(buildJSONPQueryString(host, '[[Concept:AllAnalytics]]', ['Has Short Summary', 'Has Required Field']), {cache: true})
        .then(function (response) {
          angular.forEach(response.data.query.results, function (value, key) {
            var analyticName = key;
            var shortName = value.printouts['Has Short Summary'][0];
            var fields = value.printouts['Has Required Field'];
            var analytic = _.find(results, {name: analyticName});
            if (analytic === undefined){
              // create new analytic
              analytic = {name: analyticName, attack: [], instantiations: []};
              results.push(analytic);
            }
            angular.extend(analytic, {shortName: shortName, fields: fields});
          });
          return results;
        }).catch(errorFunction('XHR failed to fetch analytic names\n'));
      }
    }

    function getGroups(host) {
      return $http.jsonp(buildJSONPQueryString(host, '[[Category:Group]]', ['Has technique', 'Has ID', 'Has alias']), {cache: true})
        .then(getGroupsComplete)
        .catch(errorFunction('XHR Failed for getGroups.\n'));

      function getGroupsComplete(response) {
        var results = [];
        angular.forEach(response.data.query.results, function (value, key) {
          var name = key;
          var techniques = _.map(value.printouts['Has technique'], function (v) {return v.fulltext;});  // list of dicts where 'fulltext' contains the technique
          var ID = value.printouts['Has ID'][0]; // string
          var aliases = value.printouts['Has alias'];
          results.push({name: name, techniques: techniques, ID: ID, aliases: aliases});
        });
        return results;
      }
    }

    function getTechniques(host) {
      return $http.jsonp(buildJSONPQueryString(host, '[[Category:Technique]]', ['Has tactic', 'Has ID', 'Has display name']), {cache: true})
        .then(getTechniquesComplete)
        .catch(errorFunction('XHR Failed for getTechniques.\n'));

      function getTechniquesComplete(response) {
        var results = [];
        angular.forEach(response.data.query.results, function (value, key) {
          var name = key;
          var tactics = _.map(value.printouts['Has tactic'], function (v) {return v.fulltext;});  // list of dicts where 'fulltext' contains the tactic
          var ID = value.printouts['Has ID'][0]; // string
          var display_name = value.printouts['Has display name'][0];
          results.push({name: name, tactics: tactics, ID: ID, 'display_name': display_name});
        });
        return results;
      }
    }

    function getSensors(host) {
      return $http.jsonp(buildJSONPQueryString(host, '[[Category:Sensors]]', ['Has Field Coverage']), {cache: true})
        .then(getSensorsComplete)
        .catch(errorFunction('XHR Failed for getSensors.\n'));

      function getSensorsComplete(response) {
        var results = [];
        angular.forEach(response.data.query.results, function (value, key) {
          var name = key;
          var fields = value.printouts['Has Field Coverage'];  // list of dicts where 'fulltext' contains the field
          results.push({name: name, fields: fields});
        });
        return results;
      }
    }

    function getDataModel(host) {
      return $http.jsonp(buildJSONPQueryString(host, '[[Has Object Name::+]]', ['Has Object Field', 'Has Object Action', 'Has Object Name']), {cache: true})
        .then(getDataModelComplete)
        .catch(errorFunction('XHR Failed for getDataModel.\n'));

      function getDataModelComplete(response) {
        var results = [];
        angular.forEach(response.data.query.results, function (value) {
          var name = value.printouts['Has Object Name'][0]; 
          var actions = value.printouts['Has Object Action']; 
          var fields = value.printouts['Has Object Field']; 
          results.push({name: name, actions: actions, fields: fields});
        });
        return results;
      }
    }

    function buildCORSQueryString(host, query, properties) {
      var uri = encodeURIComponent(query);
      angular.forEach(properties, function(value) {
        uri = uri + '|' + encodeURIComponent('?' + value);
      } );
      uri = uri + '|limit%3D9999|offset%3D0';
      return host + '/api.php?action=ask&format=json&origin=' + encodeURIComponent($window.location.origin) + '&query=' + uri;
    }

    function buildJSONPQueryString(host, query, properties) {
      var uri = encodeURIComponent(query);
      angular.forEach(properties, function(value) {
        uri = uri + '|' + encodeURIComponent('?' + value);
      } );
      uri = uri + '|limit%3D9999|offset%3D0';
      return host + '/api.php?action=ask&format=json&callback=JSON_CALLBACK&query=' + uri;
    }

    function getAttackFromCar(host) {
      return $http.jsonp(host + '/api.php?action=query&titles=Template:ATTACK_URL&prop=revisions&rvprop=content&format=json&callback=JSON_CALLBACK', {cache: true})
        .then(function (response) {
          var host = response.data.query.pages;
          host = _.values(host)[0].revisions[0]['*'].split('/');
          host.pop();
          return host.join('/');
        })
        .catch(errorFunction('XHR Failed for getAttackFromCar.\n'));
    }

    function errorFunction(message) {
      return function (error) {$log.error(message + angular.toJson(error.data, true));};
    }
  }     
})();
