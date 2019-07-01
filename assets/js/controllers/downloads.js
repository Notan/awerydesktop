'use strict';
app.controller('DownloadsController', ['$scope', '$http', '$rootScope', '$timeout', '$window', '$interval', function ($scope, $http, $rootScope, $timeout, $window, $interval) {

    $rootScope.updateDownloadsList(true);

    $scope.search = '';

    $scope.$watch('search', function () {
        if ($scope.search.length > 2) {
            console.log('here');
            for (var key in $rootScope.downloads)
                $rootScope.downloads[key].show = $rootScope.downloads[key].name.toLowerCase().indexOf($scope.search.toLowerCase()) > -1;
        } else {
            for (var key in $rootScope.downloads)
                $rootScope.downloads[key].show = true;
        }
    });

    $scope.deleteDownload = function (id) {
         $timeout(function () {
             $timeout.cancel($scope.timeout);
         },25);

        if (!confirm('Are you sure?'))
            return false;

        $rootScope.db.transaction(function (tx) {
            tx.executeSql("DELETE FROM downloads WHERE id = ?",
                [id],
                function (result) {
                    $rootScope.updateDownloadsList(false);
                }, function (tx, error) {
                    $scope.pop('error', 'Database message', error.message, 5000);
                });
        });
    };

    $scope.clearAllDownloads = function(){
        if (!confirm('Are you sure?'))
            return false;

        $rootScope.db.transaction(function (tx) {
            tx.executeSql("DELETE FROM downloads",
                [],
                function (result) {
                    $rootScope.updateDownloadsList(false);
                }, function (tx, error) {
                    $scope.pop('error', 'Database message', error.message, 5000);
                });
        });
    }

    $scope.openDownload = function (key) {
        $scope.timeout = $timeout(function () {
            console.log('openDownload', $rootScope.downloads[key]);
            $rootScope.onNeedToOpenFile($rootScope.downloads[key].link, $rootScope.downloads[key].id);
        }, 100);
    };

    $scope.openDownloadInFinder = function (key) {
        $timeout(function () {
            $timeout.cancel($scope.timeout);
        }, 50);
        $rootScope.onNeedToOpenFile($rootScope.downloads[key].link);

        console.log('openDownloadInFinder', $rootScope.downloads[key]);
    };
}]);
