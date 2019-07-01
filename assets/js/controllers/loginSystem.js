'use strict';
app.controller('LoginSystemController', ['$scope', '$http', '$rootScope', '$timeout', '$state', '$stateParams', function($scope, $http, $rootScope, $timeout, $state, $stateParams) {

    $scope.id = parseInt($stateParams.id);
    if($scope.id<=0)
        $state.go('app.dashboard');

    $scope.inProgress = false;

    var found = false;
    for(var key in $rootScope.systems){
        if($rootScope.systems[key].id===$scope.id){
            $scope.system = $rootScope.systems[key];
            console.log($scope.system);
            found = true;
            break;
        }
    }

    $scope.saveSystem = function(){
        if($scope.inProgress)
            return false;

        $scope.inProgress = true;

        if($scope.system.login==='') {
            $scope.pop('error', 'Database message', 'Fill login field', 5000);
            $scope.inProgress = false;
            return false;
        }
        if($scope.system.password==='') {
            $scope.pop('error', 'Database message', 'Fill password field', 5000);
            $scope.inProgress = false;
            return false;
        }

        $rootScope.db.transaction(function(tx) {
            tx.executeSql("UPDATE systems SET login = ? WHERE id = ?",
                [$scope.system.login, $scope.id],
                function (result) {
                    $rootScope.loginToSystem($scope.id, $scope.system.password);
                    $scope.inProgress = false;
                }, function (tx, error) {
                    console.log(error);
                    $scope.pop('error', 'Database message', error.message, 5000);
                });
        });
    };

    $scope.maybeLogin = function(event){
        if(event.keyCode === 13){
            $scope.saveSystem();
        }
    }
}]);
