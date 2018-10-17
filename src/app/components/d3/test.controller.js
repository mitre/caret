(function() {
  'use strict';

  angular
    .module('caret')
    .controller('TestController', TestController);

  /** @ngInject */
  function TestController($window, analyticLoader, _) {
    var vm = this;

    vm.width = 0;
    vm.height = 0;
    vm.border = 30;
    
    function windowSize() {
      vm.height = $window.innerHeight - 200;
      vm.width = $window.innerWidth - 35;
    }
    
    windowSize();
    angular.element($window).bind('resize', windowSize);

    vm.nodes = [];
    vm.links = [];
    vm.labels = [];

    var carHost = 'https://car.mitre.org';
    var analytics = [];
    var techniques = [];
    var groups = [];
    var sensors = [];
    var dataModel = [];

    loadCAR();

    function loadCAR() {
      analyticLoader.getAnalytics(carHost)
        .then(function (response) {
          analytics = response;
          buildLinksAndNodes();
        });
      
      analyticLoader.getTechniques()
        .then(function (response) {
          _.map(response, function (technique) {
            angular.forEach(technique.tactics, function (tactic) {
              techniques.push({name: technique.name, 
                               ID: technique.ID, 
                               display_name: technique.display_name,
                               tactic: tactic});
            });
          });
          buildLinksAndNodes();
        });

      analyticLoader.getGroups()
        .then(function (response) {
          groups = response;
          buildLinksAndNodes();
        });

      analyticLoader.getSensors(carHost)
        .then(function (response) {
          sensors = response;
          buildLinksAndNodes();
        });

      analyticLoader.getDataModel(carHost)
        .then(function (response) {
          dataModel = _.map(response, function (e) { return _.map(e.actions, function (d) { return {name: e.name + '/' + d}; }); });
          dataModel = _.flatten(dataModel);
          buildLinksAndNodes();
        });
    }

    function buildLinksAndNodes() {
      if (groups.length === 0 ||
        techniques.length === 0 ||
        analytics.length === 0 ||
        dataModel.length === 0 ||
        sensors.length === 0) 
      {
        return;
      }

      function buildNode(/*l, x, displayAccessor*/) {
        var l = arguments[0];
        var x = arguments[1];
        var displayAccessor = function (d) { return d.name; };

        if (arguments.length === 3) {
          displayAccessor = arguments[2];
        }

        var interval = 1.0 / l.length;
        var offset = interval / 2.0;
        for (var i=0; i < l.length; i++) {
          var node = {name: displayAccessor(l[i]), x: x, y: offset + interval * i};
          vm.nodes.push(node);
          angular.extend(l[i], {node: node});
        }
      }
      
      buildNode(groups, 0, function (g) { return g.aliases.join(', ');});
      buildNode(techniques, 1, function (t) { return t.tactic + '/' + t.display_name; });
      buildNode(analytics, 2, function (a) { return a.shortName; });
      buildNode(dataModel, 3);
      buildNode(sensors, 4);
      vm.labels = ['Groups', 'Techniques', 'Analytics', 'Data Model', 'Sensors'];

      //groups -> techniques
      angular.forEach(groups, function (group) {
        angular.forEach(group.techniques, function (elem) {
          var targets = _.filter(techniques, {name: elem});
          angular.forEach(targets, function (target) {
            vm.links.push({source: group.node, target: target.node});
          });
        });
      });

      angular.forEach(analytics, function (analytic) {
        angular.forEach(analytic.attack, function (attack) {
          angular.forEach(attack.tactics, function (tactic) {
            //analytics -> techniques
            var target = _.find(techniques, {name: attack.technique, tactic: tactic});
            if (target !== undefined) {
              vm.links.push({source: analytic.node, target: target.node});
            }
          });
        });
        angular.forEach(analytic.fields, function (field) {
          //analytics -> data
          var name = field.split('/')[0] + '/' + field.split('/')[1];
          var target = _.find(dataModel, {name: name});
          if (target !== undefined) {
            // Remove duplicates because we are compacting data
            if (undefined === _.find(vm.links, {source: analytic.node, target: target.node})) {
              vm.links.push({source: analytic.node, target: target.node});
            }
          }
        });
      });

      //sensor -> data
      angular.forEach(sensors, function (sensor) {
        angular.forEach(sensor.fields, function (field) {
          var name = field.split('/')[0] + '/' + field.split('/')[1];
          var target = _.find(dataModel, {name: name});
          if (target !== undefined) {
            // Remove duplicates because we are compacting data
            if (undefined === _.find(vm.links, {source: sensor.node, target: target.node})) {
              vm.links.push({source: sensor.node, target: target.node});
            }
          }
        });
      });
    }
  }
})();