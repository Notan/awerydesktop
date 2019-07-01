'use strict';
app.controller('AddSystemController', ['$scope', '$http', '$rootScope', '$timeout', '$state', function ($scope, $http, $rootScope, $timeout, $state) {

    $scope.system = {
        name: '',
        link: '',
        login: '',
        cookie: ''
    };
    $scope.systemValid = false;
    $scope.inProgress = false;

    $scope.$watch('system.link', function (newValue, oldValue) {
        if (newValue !== oldValue) {
            if ($scope.system.link.length < 10)
                $scope.system.link = 'https://' + $scope.system.link.replace(/http[s]*\:[\/]*/g, '');

            var regexp = $scope.system.link.match(/(http[s]*\:\/\/[a-zA-Z0-9\-\_\.\:]*)[\/]*/);
            var regexp2 = $scope.system.link.match(/(http*\:\/\/[a-zA-Z0-9\-\_\.\:]*)[\/]*/);
            if (regexp === null && regexp2 === null) {
                $scope.setExistsSystem(false);
            } else {
                $scope.system.link = regexp[1];
                $timeout.cancel($scope.timeout);
                if ($scope.system.link !== 'https://') {
                    $scope.timeout = $timeout(function () {
                        $scope.checkExistsSystem();
                    }, 1000);
                }
            }
        }
    });

    $scope.addSystem = function () {
        if($scope.inProgress)
            return false;

        $scope.inProgress = true;
        if ($scope.system.name === '' || $scope.system.link === '' || $scope.system.login === '') {
            $scope.pop('error', 'Database message', 'Fill all fields', 5000);
            $scope.inProgress = false;
            return false;
        }
        if (!$scope.systemValid) {
            $scope.pop('error', 'Database message', 'System link is incorrect', 5000);
            $scope.inProgress = false;
            return false;
        }
        var regexp = $scope.system.link.match(/(http[s]*\:\/\/[a-zA-Z0-9\-\_\.\:]*)[\/]*/);
        if (regexp === null) {
            $scope.pop('error', 'Database message', 'System link is incorrect', 5000);
            $scope.inProgress = false;
            return false;
        }
        $scope.system.link = regexp[1];
        if ($scope.alreadySystem()) {
            $scope.pop('error', 'Database message', 'System already exists in DB', 5000);
            $scope.inProgress = false;
            return false;
        }

        $rootScope.db.transaction(function (tx) {
            var id = new Date();
            id = id.getTime();
            tx.executeSql("INSERT INTO systems (id, name, link, login, cookie) VALUES (?, ?, ?, ?, ?)",
                [id, $scope.system.name, $scope.system.link, $scope.system.login, $scope.system.cookie],
                function (result) {
                    $rootScope.updateSystemsList(id);
                    $rootScope.loginToSystem(id, $scope.system.password);
                    $scope.inProgress = false;
                }, function (tx, error) {
                    console.log(error);
                    $scope.pop('error', 'Database message', error.message, 5000);
                });
        });
    };


    $scope.alreadySystem = function () {
        var already = false;
        for (var key in $rootScope.systems) {
            if ($rootScope.systems[key].link === $scope.system.link) {
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
    $scope.setExistsSystem = function (valid) {
        console.log('setExistsSystem', valid);
        $scope.systemValid = valid;
        if (!valid)
            $scope.pop('error', 'System error', 'System link is incorrect', 5000);
    };

    $scope.maybeLogin = function(event){
        if(event.keyCode === 13 && $scope.systemValid){
            $scope.addSystem();
        }
    }
}]);
