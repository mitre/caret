(function() {
  'use strict';

  angular
    .module('caret')
    .run(runBlock);

  /** @ngInject */
  function runBlock($log) {

    $log.debug('runBlock end');
  }

})();
