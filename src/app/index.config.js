(function() {
  'use strict';

  angular
    .module('caret')
    .config(config);

  /** @ngInject */
  function config($logProvider, $compileProvider, toastr) {
    // Enable log
    $logProvider.debugEnabled(true);

    // Enable blob:
    $compileProvider.aHrefSanitizationWhitelist(/(http|https|blob)/);

    // Set options third-party lib
    toastr.options.timeOut = 3000;
    toastr.options.positionClass = 'toast-top-right';
    toastr.options.preventDuplicates = true;
    toastr.options.progressBar = false;
  }
})();
