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
      getSensors: getSensors,
      getDataModel: getDataModel
    };

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

    function getAnalytics(host) {
      return $http.get(host + '/data/analytics.json')
        .then(function(response) {return response.data.analytics})
        .catch(errorFunction('XHR Failed for getAnalytics.\n'))
    }

    function getSensors(host) {
      return $http.get(host + '/data/sensors.json')
        .then(function(response) {return response.data.sensors})
        .catch(errorFunction('XHR Failed for getSensors.\n'))
    }

    function getDataModel(host) {
      return $http.get(host + '/data/data_model.json')
        .then(function(response) {return response.data.objects})
        .catch(errorFunction('XHR Failed for getDataModel.\n'))
    }

    function errorFunction(message) {
      return function (error) {$log.error(message + angular.toJson(error.data, true));};
    }

    return service;
  }     
})();
