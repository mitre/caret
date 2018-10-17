(function() {
  'use strict';

  angular
    .module('caret')
    .directive('acmeNavbar', acmeNavbar);

  /** @ngInject */
  function acmeNavbar($document, $window, $mdDialog, $q, analyticLoader) {
    var directive = {
      restrict: 'E',
      templateUrl: 'app/components/navbar/navbar.html',
      scope: {},
      controller: NavbarController,
      controllerAs: 'vm',
      bindToController: true
    };

    return directive;

    /** @ngInject */
    function NavbarController() {
      var vm = this;

      vm.showAbout = function (ev) {
        $mdDialog.show({
          templateUrl: 'app/components/about/about.tmpl.html',
          parent: angular.element($document.body),
          controller: 'AboutController',
          controllerAs: 'vm',
          targetEvent: ev,
          clickOutsideToClose:true
        });
      };

      vm.downloadURL = "";
      downloadData();
      
      function downloadData () {
        var carHost = 'https://car.mitre.org';
        var analytics = [];
        var techniques = [];
        var groups = [];
        var sensors = [];
        var dataModel = [];

        loadCAR();

        function loadCAR() {
          var all = [];

          all.push(analyticLoader.getAnalytics(carHost)
            .then(function (response) {
              analytics = response;
            }));
          all.push(analyticLoader.getTechniques()
            .then(function (response) {
              techniques = response;
            }));

          all.push(analyticLoader.getGroups()
            .then(function (response) {
              groups = response;
            }));

          all.push(analyticLoader.getSensors(carHost)
            .then(function (response) {
              sensors = response;
            }));

          all.push(analyticLoader.getDataModel(carHost)
            .then(function (response) {
              dataModel = response;
            }));

          $q.all(all).then(function () {
            var downloadObject = {analytics: analytics, techniques: techniques, groups: groups, sensors: sensors, dataModel: dataModel};
            var b = new $window.Blob([angular.toJson(downloadObject, true)], {type: 'text/json'} );
            vm.downloadURL = $window.URL.createObjectURL(b);
          });
        }
      }
    }
  }
})();
