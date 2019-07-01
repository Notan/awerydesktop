'use strict';
app.controller('DashboardController', ['$scope', '$http', '$rootScope', '$state', function ($scope, $http, $rootScope, $state) {

    var ipcRenderer = require('electron').ipcRenderer;

    $scope.system = {
        name: '',
        link: '',
        login: '',
        cookie: ''
    };
    $scope.canSelectLocal = false;

    $rootScope.updateSystemsList();
    $scope.cdnVersion = null;
    $scope.localVersion = null;
    $scope.autoLogin = false;

    $scope.addSystem = function () {
        if ($scope.system.name === '' || $scope.system.link === '' || $scope.system.login === '' || $scope.system.cookie === '') {
            $scope.pop('error', 'Database message', 'Fill all fields', 5000);
            return false;
        }
        if (!$scope.existsSystem($scope.system.link)) {
            $scope.pop('error', 'Database message', 'System link is incorrect', 5000);
            return false;
        }

        $rootScope.db.transaction(function (tx) {
            var id = new Date();
            id = id.getTime();
            tx.executeSql("INSERT INTO systems (id, name, link, login, cookie) VALUES (?, ?, ?, ?, ?)",
                [id, $scope.system.name, $scope.system.link, $scope.system.login, $scope.system.cookie],
                function (result) {
                    $rootScope.updateSystemsList();
                    $scope.system = {
                        name: '',
                        link: '',
                        login: '',
                        cookie: ''
                    };
                }, function (tx, error) {
                    console.log(error);
                    $scope.pop('error', 'Database message', error.message, 5000);
                });
        });
    };

    $scope.openAwerySite = function () {
        require('electron').shell.openExternal('https://awery.aero')
    }

    $scope.getCDNVersion = function () {
        $http({
            method: 'GET',
            url: 'http://cdn.awery.com/uibeta/version.as?rand=' + new Date().getTime(),
        }).success(function (data, status, headers) {
            console.log(data);
            var r = data.match(/\"([0-9\.]*)\"/);
            $scope.cdnVersion = r.length > 1 ? parseFloat(r[1]) : 0;

            if ($scope.cdnVersion > $scope.localVersion) {
                ipcRenderer.send('update-local-version');
            } else {
                $rootScope.loadFrom = 'local';
                $scope.canSelectLocal = true;
            }

            console.log($scope.cdnVersion);
        }).error(function (data, status, headers) {
            console.log('E', data);
        });
    }

    ipcRenderer.on('set-version-as', function (event, args) {
        $scope.localVersion = parseFloat(args);
        $scope.getCDNVersion();
    });

    ipcRenderer.on('update-complete', function (event) {
        $rootScope.loadFrom = 'local';
        $scope.canSelectLocal = true;
        $scope.$apply();
    });

    ipcRenderer.on('auto-login', function (e, args) {
        $scope.autoLogin = args;
        //if 1 system - auto login
        console.log('AUTO LOGIN? ', $rootScope.systems.length, $scope.autoLogin);
        if ($rootScope.systems.length === 1 && $scope.autoLogin) {
            $rootScope.loginToSystem($rootScope.systems[0].id, '');
        }
    });

    ipcRenderer.send('load-local-cdn-version');
}]);
