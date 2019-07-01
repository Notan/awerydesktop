'use strict';

/**
 * Config for the router
 */
angular.module('app')
  .run(
    [          '$rootScope', '$state', '$stateParams',
      function ($rootScope,   $state,   $stateParams) {
          $rootScope.log = true;

          $rootScope.$state = $state;
          $rootScope.$stateParams = $stateParams;
          $rootScope.user = {};
          $rootScope.auth = false;
      }
    ]
  )
  .config(
    [          '$stateProvider', '$urlRouterProvider', 'JQ_CONFIG', 'MODULE_CONFIG',
      function ($stateProvider,   $urlRouterProvider,   JQ_CONFIG,   MODULE_CONFIG) {

          $urlRouterProvider
              .otherwise('/app/dashboard');

          
          $stateProvider
              .state('app', {
                  url: '/app',
                  templateUrl: 'assets/tpl/app.html'
              })
              .state('app.dashboard', {
                  url: '/dashboard',
                  templateUrl: 'assets/tpl/app_dashboard.html',
                  controller: 'DashboardController',
                  resolve: load( ['assets/js/controllers/dashboard.js'] )
              })
              .state('app.add', {
                  url: '/add',
                  templateUrl: 'assets/tpl/addSystem.html',
                  controller: 'AddSystemController',
                  resolve: load( ['assets/js/controllers/addSystem.js'] )
              })
              .state('app.edit', {
                  url: '/edit/:id',
                  templateUrl: 'assets/tpl/editSystem.html',
                  controller: 'EditSystemController',
                  resolve: load( ['assets/js/controllers/editSystem.js'] )
              })
              .state('app.login', {
                  url: '/login/:id',
                  templateUrl: 'assets/tpl/loginSystem.html',
                  controller: 'LoginSystemController',
                  resolve: load( ['assets/js/controllers/loginSystem.js'] )
              })
              .state('app.downloads', {
                  url: '/downloads',
                  templateUrl: 'assets/tpl/downloads.html',
                  controller: 'DownloadsController',
                  resolve: load( ['assets/js/controllers/downloads.js'] )
              });


          function load(srcs, callback) {
            return {
                deps: ['$ocLazyLoad', '$q',
                  function( $ocLazyLoad, $q ){
                    var deferred = $q.defer();
                    var promise  = false;
                    srcs = angular.isArray(srcs) ? srcs : srcs.split(/\s+/);
                    if(!promise){
                      promise = deferred.promise;
                    }
                    angular.forEach(srcs, function(src) {
                      promise = promise.then( function(){
                        if(JQ_CONFIG[src]){
                          return $ocLazyLoad.load(JQ_CONFIG[src]);
                        }
                        angular.forEach(MODULE_CONFIG, function(module) {
                          if( module.name == src){
                             name = module.name;
                          }else{
                             name = src;
                          }
                        });
                        return $ocLazyLoad.load(name);
                      } );
                    });
                    deferred.resolve();
                    return callback ? promise.then(function(){ return callback(); }) : promise;
                }]
            }
          }


      }
    ]
  );
