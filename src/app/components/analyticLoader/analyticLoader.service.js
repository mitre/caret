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

    function getGroups() {
      return $http.get('https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json', {cache: true})
        .then(getGroupsComplete)
        .catch(errorFunction('XHR Failed for getGroups.\n'));

      function getGroupsComplete(response) {
        var results = [];
        angular.forEach(response.data.objects, function (value) {
          // Check if the object is a Group
          if(value.type == 'intrusion-set') {
            var ID = _.map(value.external_references, function (v) {if(v.source_name == 'mitre-attack') return v.external_id;}).join('');  //string
            var name = 'Group/' + ID;   //string
            var aliases = (value.aliases != undefined ? value.aliases : []);  //list of strings
            //Getting the Techniques
            var target_references = _.map(_.filter(response.data.objects, {'type':'relationship', 'relationship_type':'uses', 'source_ref':value.id}), 'target_ref');    //target_references is a list of strings that must be matched with a technique id
            var target_techniques = [];  //target_techniques is a list of dicts that has the group techniques
            angular.forEach(target_references, function (value) {
              var t = _.filter(response.data.objects, {'type':'attack-pattern', 'id':value});
              if(t.length > 0) {
                target_techniques.push(t[0]);
              }            
            }); 
            var techniques = [];  //list of strings
            angular.forEach(target_techniques, function (value) {
              techniques.push(_.map(value.external_references, function (v) {if(v.source_name == 'mitre-attack') return 'Technique/' + v.external_id;}).join(''));   
            });                   
            results.push({name: name, techniques: techniques, ID: ID, aliases: aliases});
          }
        });
        return results;
      }
    }

    function getTechniques() {
      return $http.get('https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json', {cache: true})
        .then(getTechniquesComplete)
        .catch(errorFunction('XHR Failed for getTechniques.\n'));

      function getTechniquesComplete(response) {
        var results = [];
        angular.forEach(response.data.objects, function (value, key) {
          //Check if the object is a Technique
          if(value.type == 'attack-pattern') {
            var ID = _.map(value.external_references, function (v) { if (v.source_name == 'mitre-attack') return v.external_id; }).join('');  //string
            var name = 'Technique/' + ID;   //string
            var tactics = _.map(value.kill_chain_phases, function (v) { if (v.kill_chain_name == 'mitre-attack') return _.startCase(v.phase_name); });  // list of dicts where 'phase_name' contains the tactic
            var display_name = value.name;  //string
            results.push({name: name, tactics: tactics, ID: ID, 'display_name': display_name});
          }
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

    return service;
  }     
})();
