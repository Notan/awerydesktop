'use strict';
app.controller('EditSystemController', ['$scope', '$http', '$rootScope', '$timeout', '$state', '$stateParams', function($scope, $http, $rootScope, $timeout, $state, $stateParams) {

    $scope.id = parseInt($stateParams.id);
    if($scope.id<=0)
        $state.go('app.dashboard');

    var found = false;
    for(var key in $rootScope.systems){
        if($rootScope.systems[key].id===$scope.id){
            $scope.system = $rootScope.systems[key];
            console.log($scope.system);
            found = true;
            break;
        }
    }
    $scope.systemValid = true;
    $scope.inProgress = false;

    $scope.$watch('system.link', function(newValue, oldValue){
        if(newValue!==oldValue) {
            $scope.systemValid = false;
            $scope.checkExistsSystem();
        }
    })

    $scope.saveSystem = function(){
        if($scope.inProgress)
            return false;

        $scope.inProgress = true;
        if($scope.system.name==='' || $scope.system.link==='' || $scope.system.login==='') {
            $scope.pop('error', 'Database message', 'Fill all fields', 5000);
            $scope.inProgress = false;
            return false;
        }
        if(!$scope.systemValid){
            $scope.pop('error', 'Database message', 'System link is incorrect', 5000);
            $scope.inProgress = false;
            return false;
        }
        var regexp = $scope.system.link.match(/(http[s]*\:\/\/[a-zA-Z0-9\-\_\.\:]*)[\/]*/);
        if(regexp===null){
            $scope.pop('error', 'Database message', 'System link is incorrect', 5000);
            $scope.inProgress = false;
            return false;
        }
        $scope.system.link = regexp[1];
        if($scope.alreadySystem()){
            $scope.pop('error', 'Database message', 'System already exists in DB', 5000);
            $scope.inProgress = false;
            return false;
        }

        $rootScope.db.transaction(function(tx) {
            tx.executeSql("UPDATE systems SET name = ?, link = ?, login = ? WHERE id = ?",
                [$scope.system.name, $scope.system.link, $scope.system.login, $scope.id],
                function (result) {
                    $rootScope.loginToSystem($scope.id, $scope.system.password);
                    $scope.inProgress = false;
                }, function (tx, error) {
                    console.log(error);
                    $scope.pop('error', 'Database message', error.message, 5000);
                });
        });
    };

    $scope.alreadySystem = function(){
        var already = false;
        for(var key in $rootScope.systems){
            if($rootScope.systems[key].link===$scope.system.link && $scope.systems[key].id!==$scope.id){
                already = true;
                break;
            }
        }
        return already;
    };
    $scope.checkExistsSystem = function () {
        $http({
            method: 'HEAD',
            url: $scope.system.link
        }).success(function (data, status, headers) {
            $scope.setExistsSystem(status === 200);
        }).error(function (data, status, headers) {
            $scope.setExistsSystem(false);
        });
    };
    $scope.setExistsSystem = function(valid){
        console.log('setExistsSystem', valid);
        $scope.systemValid = valid;
        if(!valid)
            $scope.pop('error', 'System error', 'System link is incorrect', 5000);
    };
    $scope.deleteSystem = function(){
        if(!confirm('Are you sure?'))
            return false;
        $rootScope.db.transaction(function(tx) {
            tx.executeSql("DELETE FROM systems WHERE id = ?",
                [$scope.id],
                function (result) {
                    $state.go('app.dashboard');
                }, function (tx, error) {
                    $scope.pop('error', 'Database message', error.message, 5000);
                });
        });
    };

    $scope.maybeLogin = function(event){
        if(event.keyCode === 13){
            if(!$scope.systemValid){
                $scope.checkExistsSystem();
            }else{
                $scope.saveSystem();
            }
        }
    }
}]);
