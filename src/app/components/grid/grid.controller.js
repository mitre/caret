(function() {
  'use strict';

  angular
    .module('caret')
    .controller('GridController', GridController);

  /** @ngInject */
  function GridController($scope, $timeout, $log, $mdDialog, $document, toastr, analyticLoader, _) {
    var vm = this;
    var defaultBackground = 'red';
    vm.loading = true;
    vm.loadCAR = loadCAR;
    vm.analytics = [];
    vm.techniques = [];
    vm.groups = [];
    vm.grid = [];
    vm.gridLarge = true;
    vm.gridRatio = '7:3';
    vm.gridStyle = {width: '100%'};
    vm.gridColumns = 0;
    vm.showAdvanced = showAdvanced;
    vm.filter = '';
    vm.groupSearch = groupSearch;
    vm.selectedGroup = '';
    vm.clearAll = clearAll;
    vm.selectAll = selectAll;
    vm.selectedGroups = [];
    vm.unselectedGroups = [];
    vm.analyticMouseenter = analyticMouseenter;
    vm.analyticMouseleave = analyticMouseleave;
    vm.enableOutline = true;
    vm.sensors = [];

    var carHost = 'https://car.mitre.org';
    var attackHost = 'https://attack.mitre.org';

    function analyticMouseenter (analytic) {
      if (!vm.enableOutline) {
        return;
      }
      
      angular.forEach(analytic.attack, function (technique) {
        var name = technique.technique;
        angular.forEach(technique.tactics, function (tactic) {
          //find the technique 
          var techObject = _.find(vm.grid, {name: name, tactic: tactic});
          if (techObject !== undefined) {
            techObject.outline = 'outline';
          }
        });
      });
    }

    function analyticMouseleave (analytic) {
      if (!vm.enableOutline) {
        return;
      }

      angular.forEach(analytic.attack, function (technique) {
        var name = technique.technique;
        angular.forEach(technique.tactics, function (tactic) {
          //find the technique 
          var techObject = _.find(vm.grid, {name: name, tactic: tactic});
          if (techObject !== undefined) {
            techObject.outline = '';
          }
        });
      });
    }

    $scope.$watch(function () {
      return vm.analytics;
    }, changedAnalytics, true);

    $scope.$watch(function () {
      return vm.gridLarge;
    }, changedGridSize, true);

    $scope.$watch(function () {
      return vm.filter;
    }, changedFilter, true);

    $scope.$watch(function () {
      return vm.selectedGroups;
    }, changedGroups, true);

    loadCAR()

    function selectAll() {
      angular.forEach(vm.analytics, function (analytic) {
        if (analytic.visible) {
          analytic.active = true;
        }
      });
    }

    function clearAll() {
      angular.forEach(vm.analytics, function (analytic) {
        if (analytic.visible) {
          analytic.active = false;
        }
      });
    }

    function changedGroups(newGroups) {
      vm.unselectedGroups = _.difference(vm.groups, newGroups);

      angular.forEach(vm.grid, function (technique) {
        if (newGroups.length === 0) {
          technique.opacity = '1.0';
        } else if (_.every(newGroups, function (group) {
          return -1 === _.indexOf(group.techniques, technique.name);
        })) {
          technique.opacity = '0.3';
        } else {
          technique.opacity = '1.0';
        }
      });

      changedFilter(vm.filter);
    }

    function groupSearch (query) {
      var groups = vm.unselectedGroups;

      if (query)
      {
        return groups.filter( function (value) {
          if (angular.lowercase(value.name).indexOf(angular.lowercase(query)) === 0) {
            return true;
          }
          angular.forEach(value.aliases, function (alias) {
            if (angular.lowercase(alias).indexOf(angular.lowercase(query)) === 0) {
              return true;
            }
          });
          return false;
        });
      } else {
        return groups;
      }
    }

    function showAdvanced(ev, name) {
      if (name === '') {
        return;
      }
      $mdDialog.show({
        templateUrl: 'app/components/analyticDialog/analyticDialog.tmpl.html',
        parent: angular.element($document.body),
        controller: buildDialogController(name),
        targetEvent: ev,
        clickOutsideToClose:true
      })
      .then(function(answer) {
        $scope.status = 'You said the information was "' + answer + '".';
      }, function() {
        $scope.status = 'You cancelled the dialog.';
      });
    }

    function buildDialogController(name) {
      return /** @ngInject */ function ($sce, $scope, $mdDialog) {
        $scope.name = name;   
        var temp = name.split("/");
        name = temp[0].toLowerCase() + 's/' + temp[1];
        $scope.uri = $sce.trustAsResourceUrl(attackHost + "/techniques/"  + encodeURIComponent(name.split('/')[1]) + '/');
        $scope.hide = function() {
          $mdDialog.hide();
        };
        $scope.cancel = function() {
          $mdDialog.cancel();
        };
        $scope.answer = function(answer) {
          $mdDialog.hide(answer);
        };
      };
    }

    function changedGridSize(newValue) {
      if (newValue) {
        // Large grid
        vm.gridRatio = '7:3';
        vm.grid = produceGrid(vm.techniques, vm.gridLarge);
        vm.gridStyle = {width: '100%'};
      } else {
        // small grid
        vm.gridRatio = '1:1';
        vm.grid = produceGrid(vm.techniques, vm.gridLarge);
        vm.gridStyle = {width: '200px'};
      }
      changedAnalytics(vm.analytics);
    }

    function changedAnalytics(newValue) {
      // compute analytic coverage
      var actives = _.filter(newValue, 'active');
      //reset the background of all techniques
      angular.forEach(vm.grid, function (technique) { 
        technique.background = technique.defaultBackground;
      });
      angular.forEach(actives, function (active) {
        angular.forEach(active.attack, function (technique) {
          var name = technique.technique;
          var coverage = technique.coverage;
          angular.forEach(technique.tactics, function (tactic) {
            //find the technique 
            var techObject = _.find(vm.grid, {name: name, tactic: tactic});
            if (techObject !== undefined) {
              if ((techObject.background === 'red' && (coverage === 'Partial' || coverage === 'Complete' )) ||
                  (techObject.background === 'yellow' && coverage === 'Complete' ) ) {
                techObject.background = coverage === 'Partial' ? 'yellow' : 'green';
              }
            }
          });
        });
      });

      changedGroups(vm.selectedGroups);
    }

    function changedFilter(newValue) {
      // take the filter value and update 
      newValue = newValue.toLowerCase();
      var selectedGroupsTechniques;
      if (vm.selectedGroups.length !== 0) {
        // does any selected group use any of these techniques?
        selectedGroupsTechniques = _.flatten(_.map(vm.selectedGroups, function (group) {return group.techniques;}));
      }

      for (var i = 0; i < vm.analytics.length; i++) {
        var analytic = vm.analytics[i];
        // If there are any active groups, hide analytics that aren't in that group
        if (selectedGroupsTechniques !== undefined) {
          // what techniques does this analytic detect?
          var techniques = _.map(analytic.attack, 'technique');

          // does any selected group use any of these techniques?
          if (_.intersection(techniques, selectedGroupsTechniques).length === 0) {
            analytic.visible = false;
            continue;
          }
        }

        var nameMatch = analytic.name.toLowerCase().search(newValue);
        var shortNameMatch = analytic.shortName.toLowerCase().search(newValue);

        analytic.visible = (newValue === '' || nameMatch !== -1 || shortNameMatch !== -1);
      }
    }

    function loadCAR() {      
      analyticLoader.getAnalytics(carHost)
        .then(function (response) {
          if(response) {
            vm.analytics = _.map(response, function (r) { return angular.extend(r, {active: false, visible: true}); });
            toastr.info('Loaded analytics');
          }
        });
        
      analyticLoader.getTechniques()
        .then(function (response) {
          if(response) {
            vm.techniques = _.map(response, function (r) { return angular.extend(r, {background: defaultBackground}); });
            vm.grid = produceGrid(vm.techniques, vm.gridLarge);
            toastr.info('Loaded techniques');
          }
        });

      analyticLoader.getGroups()
        .then(function (response) {
          if(response) {
            vm.groups = _.map(response, function (r) { return angular.extend(r, {active: false, displayName: groupDisplayName(r)}); });
            vm.unselectedGroups = vm.groups;
            toastr.info('Loaded groups');
          }
        });

      analyticLoader.getSensors(carHost)
        .then(function (response) {
          if(response) {
            vm.sensors = response;
            toastr.info('Loaded sensors');
          }
        });
    }

    function groupDisplayName(group) {
      return group.name + ': ' + group.aliases.join(', ');
    }

    function produceGrid(techniques, large) {
      var dedup = [];
      angular.forEach(techniques, function (technique) {
        var name = technique.name;
        var ID = technique.ID;
        var display_name = technique.display_name;
        angular.forEach(technique.tactics, function (tactic) {
          dedup.push({name:name, display_name: display_name, tactic: tactic, ID:ID, defaultBackground: defaultBackground, background: defaultBackground});
        });
      });

      var columns = [];
      angular.forEach(dedup, function (technique) {
        var col = _.find(columns, {name: technique.tactic});
        if (col === undefined) {
          col = {name: technique.tactic, techniques: []};
          columns.push(col);
        }
        col.techniques.push(technique);
      });

      //Sort columns in the order: Initial Access, Execution, Persistence, Privilege Escalation, Defense Evasion, Credential Access, Discovery, Lateral Movement, Collection, Exfiltration, Command And Control
      if(columns.length > 0) {
        columns = _.map(['Initial Access', 'Execution', 'Persistence', 'Privilege Escalation', 'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement', 'Collection', 'Exfiltration', 'Command And Control'], function (i) { 
          var index = _.findIndex(columns, {'name': i});
          return columns[index]; 
        });
      }    
      
      var linearized = [];
      var longestLength = 0;
      angular.forEach(columns, function (col) {
        longestLength = col.techniques.length > longestLength ? col.techniques.length : longestLength;
      });

      if (large) {
        angular.forEach(columns, function (col) {
          linearized.push({display_name: col.name, background: 'white', defaultBackground: "white"});
        });
      }
     
      vm.gridColumns = columns.length;

      for (var i=0; i < longestLength; i++) {
        for (var j=0; j < columns.length; j++) {
          if (i >= columns[j].techniques.length) {
            linearized.push({name: "", defaultBackground: "white", background: 'white', outline: ''});
          } else {
            linearized.push(columns[j].techniques[i]);
          }
        }
      }

      if(linearized.length > 0) {
        vm.loading = false;
      }

      return linearized;
    }

    function generateCSV(groups, techniques, analytics, data, sensors) {
      var output = [];
      output.push(generateCSV("groups", groups));
      output.push(generateCSV("techniques", techniques));
      output.push(generateCSV("analytics", analytics));
      output.push(generateCSV("data", data));
      output.push(generateCSV("sensors", sensors));
      return "".join(output);
    }

    function _generateCSV(name, obj_list) {
      var output = [];
      var id = 0;
      output.push("# " + name + "\n");
      output.push('id');
      var k = obj_list[0].keys();
      for (var i; i < k.length; i++) {
        output.push(',' + k[i]);
      }
      output.push("\n");
      angular.forEach(obj_list, function (obj) {
        output.push(id.toString() + ',');
        for (var i; i < k.length; i++) {
          output.push(obj[k[i]]);
        }
        output.push('\n');
      });
      return output;
    }
  }
})();
