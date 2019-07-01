'use strict';

/* Controllers */

angular.module('app')
    .controller('AppCtrl', ['$scope', '$window', '$http', '$state', '$location', 'toaster', '$rootScope', '$timeout',
        function ($scope, $window, $http, $state, $location, toaster, $rootScope, $timeout) {

            $scope.menu = {};
            $scope.menu.profile = false;
            $scope.menu.mvisible = false;

            $window.nodeIntegration = true;

            $rootScope.loadFrom = 'cdn';

            $rootScope.systems = [];

            var ipcRenderer = require('electron').ipcRenderer;

            $rootScope.pop = function (type, title, message, timeout) {
                toaster.pop(type, title, message, timeout, 'trustedHtml');
            };

            $rootScope.db = openDatabase("AWERY", "0.1", "A list of systems.", 1000, function (e) {
                if ($rootScope.db) {
                    $rootScope.pop('success', 'Database message', 'Database initialized successfully', 5000);

                    $rootScope.db.transaction(function (tx) {
                        tx.executeSql("SELECT * FROM systems ORDER BY name ASC", [],
                            function (tx, result) {
                                $rootScope.updateSystemsList();
                            }, function (tx, error) {
                                tx.executeSql("CREATE TABLE systems (id INT UNIQUE, name TEXT, link TEXT UNIQUE, login TEXT, cookie TEXT, logo TEXT)", [], null, null);
                            });
                    });

                    $rootScope.db.transaction(function (tx) {
                        tx.executeSql("SELECT * FROM downloads ORDER BY id DESC", [],
                            function (tx, result) {
                                $rootScope.updateDownloadsList(false);
                            }, function (tx, error) {
                                tx.executeSql("CREATE TABLE downloads (id INT UNIQUE, name TEXT, link TEXT, size FLOAT, date DATE)", [], null, null);
                            });
                    });
                }
            });

            $rootScope.updateSystemsList = function (id) {
                $rootScope.db.transaction(function (tx) {
                    tx.executeSql("SELECT * FROM systems ORDER BY name ASC", [],
                        function (tx, result) {
                            $rootScope.systems = [];
                            for (var i = 0; i < result.rows.length; i++) {
                                $rootScope.systems.push(result.rows.item(i));
                                $rootScope.systems[i].authorized = false;
                                $rootScope.systems[i].authorizeChecking = false;
                                if (id !== undefined && id == $rootScope.systems[i].id) {
                                    $rootScope.checkSystemAuth(i);
                                }
                            }
                            console.log($rootScope.systems);

                            $scope.$apply();
                        }, function (tx, error) {
                            $rootScope.pop('error', 'Database message', 'Error while updated systems list', 5000);
                        });
                });
            };
            $rootScope.downloads = [];
            $rootScope.updateDownloadsList = function (check) {
                $rootScope.db.transaction(function (tx) {
                    tx.executeSql("SELECT * FROM downloads ORDER BY id DESC", [],
                        function (tx, result) {
                            $rootScope.downloads = [];
                            for (var i = 0; i < result.rows.length; i++) {
                                $rootScope.downloads.push(result.rows.item(i));
                                var e = explode('.', $rootScope.downloads[i].name);
                                $rootScope.downloads[i].ext = e[e.length - 1];
                                $rootScope.downloads[i].icon = 'fa-file';
                                switch ($rootScope.downloads[i].ext) {
                                    case 'jpg', 'jpeg', 'png':
                                        $rootScope.downloads[i].icon = 'fa-file-image-0';
                                        break;
                                    case 'pdf':
                                        $rootScope.downloads[i].icon = 'fa-file-pdf-o';
                                        break;
                                    case 'xls', 'xlsx':
                                        $rootScope.downloads[i].icon = 'fa-file-excel-o';
                                        break;
                                    case 'doc', 'docx':
                                        $rootScope.downloads[i].icon = 'fa-file-word-o';
                                        break;
                                    case 'csv':
                                        $rootScope.downloads[i].icon = 'fa-file-text-o';
                                        break;
                                }
                                if ($rootScope.downloads[i].size > 1024)
                                    $rootScope.downloads[i].sizeText = $rootScope.downloads[i].size / 1024 + ' Mb';
                                else
                                    $rootScope.downloads[i].sizeText = $rootScope.downloads[i].size + ' Kb';

                                $rootScope.downloads[i].show = true;
                                $rootScope.downloads[i].new = (new Date().getTime() - $rootScope.downloads[i].id) / 1000 < 5;

                                if (check) {
                                    ipcRenderer.send('check-file', $rootScope.downloads[i].link, $rootScope.downloads[i].id);
                                }
                            }
                            console.log($rootScope.downloads);

                            $scope.$apply();
                        }, function (tx, error) {
                            $rootScope.pop('error', 'Database message', 'Error while updated downloads list', 5000);
                        });
                });
            };

            /*angular.element(document.getElementById('dashboard')).scope().$apply(
             angular.element(document.getElementById('app')).injector().get('$rootScope').setSystemAuth(1, false)
             )*/

            $rootScope.loginToSystem = function (id, password) {
                $rootScope.timeout = $timeout(function () {
                    for (var key in $rootScope.systems) {
                        if ($rootScope.systems[key].id === id) {
                            $rootScope.systems[key].authorizeChecking = true;
                            if (password === '') {
                                console.log('password is empty');
                                if ($rootScope.systems[key].cookie === '') {
                                    $location.url('/app/edit/' + $rootScope.systems[key].id);
                                    return false;
                                } else {
                                    $http({
                                        method: 'POST',
                                        url: $rootScope.systems[key].link + '/system/decoration.php',
                                        headers: {
                                            'Content-Type': 'application/x-www-form-urlencoded',
                                            'DesktopAcmAppMode': 'true',
                                            'Authorization': 'Bearer ' + $rootScope.systems[key].cookie
                                        },
                                    }).success(function (data, status, headers) {
                                        $scope.setSystemAuth(key, data.status);

                                        if (data.data !== null && data.data !== undefined) {
                                            var logo = data.data.customer_logo ? data.data.customer_logo : data.data.awery_logo;
                                            console.info(logo);
                                            if (logo.match(/http[s]*\:\/\//) == null) {
                                                $rootScope.setSystemLogo(key, $rootScope.systems[key].link + ((logo[0] == '/') ? '' : '/') + logo);
                                            } else {
                                                $rootScope.setSystemLogo(key, logo);
                                            }
                                        }
                                        if (data.status) {
                                            $timeout(function () {
                                                ipcRenderer.send('erp-system-chosen', $rootScope.systems[key].link, $rootScope.systems[key].cookie, $rootScope.systems[key].name, $rootScope.loadFrom==='local');
                                            }, 500);
                                        } else {
                                            $location.url('/app/login/' + $rootScope.systems[key].id);
                                        }
                                    }).error(function (data, status, headers) {
                                        $location.url('/app/login/' + $rootScope.systems[key].id);
                                        console.warn('checkSystemAuth ERROR', data, $rootScope.systems[key].cookie);
                                        $scope.setSystemAuth(key, false);
                                    });
                                }
                            } else {
                                console.log('password isn\'t empty');
                                var body = {
                                    "serial": {
                                        "_login": $rootScope.systems[key].login,
                                        "_passwd": password,
                                        "save": 'false'
                                    },
                                    'method': 'login'
                                };
                                $http({
                                    method: 'POST',
                                    url: $rootScope.systems[key].link + '/system/login.php',
                                    headers: {
                                        'Content-Type': 'text/html; charset=UTF-8',
                                        'Authorization': 'Bearer ' + $rootScope.systems[key].cookie,
                                        'DesktopAcmAppMode': 'true'
                                    },
                                    data: body,
                                    async: true
                                }).success(function (data, status, headers) {
                                    console.log('LOGIN TO SYSTEM RESULT', data, status);
                                    if (data.data.status) {
                                        $rootScope.setSystemAuth(key, true);
                                        $rootScope.setSystemCookie(key, data.data.token, true);
                                    } else {
                                        console.warn('Something wrong with login');
                                        //redirect to login
                                        $location.url('/app/login/' + $rootScope.systems[key].id);
                                        $scope.pop('error', 'Login error', data.data.error, 5000);
                                    }
                                }).error(function (data, status, headers) {
                                    console.warn('error', data, status, headers);
                                });

                                console.log('loginToSystem OK', $rootScope.systems[key], password);
                            }
                            return false;
                        }
                    }
                }, 100);
            };

            $rootScope.checkSystemAuth = function (key) {
                console.log('checkSystemAuth', key);
                $rootScope.systems[key].authorizeChecking = true;
                $http({
                    method: 'POST',
                    url: $rootScope.systems[key].link + '/system/decoration.php',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'DesktopAcmAppMode': 'true',
                        'Authorization': 'Bearer ' + $rootScope.systems[key].cookie
                    },
                }).success(function (data, status, headers) {
                    console.warn('checkSystemAuth ERROR', data, $rootScope.systems[key].cookie);
                    $scope.setSystemAuth(key, data.status);
                    if (data.data !== null && data.data !== undefined) {
                        var logo = data.data.customer_logo ? data.data.customer_logo : data.data.awery_logo;
                        console.info(logo);
                        if (logo.match(/http[s]*\:\/\//) == null) {
                            $rootScope.setSystemLogo(key, $rootScope.systems[key].link + ((logo[0] == '/') ? '' : '/') + logo);
                        } else {
                            $rootScope.setSystemLogo(key, logo);
                        }
                    }
                }).error(function (data, status, headers) {
                    console.warn('checkSystemAuth ERROR', data, $rootScope.systems[key].cookie);
                    $scope.setSystemAuth(key, false);
                });
            };

            $rootScope.editSystemInfo = function (key) {
                $timeout(function () {
                    $timeout.cancel($rootScope.timeout);
                }, 50);
                console.log('editSystemInfo', key);
                $location.url('/app/edit/' + $rootScope.systems[key].id);
            };

            $rootScope.setSystemAuth = function (key, auth) {
                console.log('setSystemAuth', key, auth);
                $rootScope.systems[key].authorized = auth;
                $rootScope.systems[key].authorizeChecking = false;
            };

            $rootScope.setSystemCookie = function (key, cookie, forceLogin) {
                console.log('setSystemCookie', key, cookie);
                $rootScope.systems[key].cookie = cookie;

                $rootScope.db.transaction(function (tx) {
                    tx.executeSql("UPDATE systems SET cookie = ? WHERE id = ?",
                        [cookie, $rootScope.systems[key].id],
                        function (result) {
                            if (forceLogin) {
                                if (cookie === '')
                                    $location.url('/app/edit/' + $rootScope.systems[key].id);
                                else
                                    $timeout(function () {
                                        ipcRenderer.send('erp-system-chosen', $rootScope.systems[key].link, $rootScope.systems[key].cookie, $rootScope.systems[key].name, $rootScope.loadFrom==='local');
                                    }, 500)
                            }
                        }, function (tx, error) {
                            $scope.pop('error', 'Database message', error.message, 5000);
                        });
                });
            };

            $rootScope.setSystemLogo = function (key, logo) {
                console.log('setSystemLogo', key, logo);
                $rootScope.systems[key].logo = logo;
                $rootScope.db.transaction(function (tx) {
                    tx.executeSql("UPDATE systems SET logo = ? WHERE id = ?",
                        [logo, $rootScope.systems[key].id],
                        function (result) {
                        }, function (tx, error) {
                            $scope.pop('error', 'Database message', error.message, 5000);
                        });
                });
            };

            $rootScope.onNeedToOpenFile = function (path, id) {
                ipcRenderer.send('open-file', path, id);
            };

            ipcRenderer.on('file-does-not-exist', function (event, id, alert) {
                $rootScope.db.transaction(function (tx) {
                    tx.executeSql("DELETE FROM downloads WHERE id = ?",
                        [id],
                        function (result) {
                            $rootScope.updateDownloadsList(false);
                        }, function (tx, error) {
                            $scope.pop('error', 'Database message', error.message, 5000);
                        });
                });
                if (alert) {
                    $scope.pop('error', 'Error', 'File no longer exists', 5000);
                }
            });


            $rootScope.addDownload = function (name, link, size, date) {
                if (name === '' || link === '' || link === '' || date === '') {
                    $scope.pop('error', 'Database message', 'Fill all fields', 5000);
                    return false;
                }

                $rootScope.db.transaction(function (tx) {
                    var id = new Date();
                    id = id.getTime();
                    tx.executeSql("INSERT INTO downloads (id, name, link, size, `date`) VALUES (?, ?, ?, ?, ?)",
                        [id, name, link, size, date],
                        function (result) {
                            $rootScope.updateDownloadsList(false);
                        }, function (tx, error) {
                            console.log(error);
                            $scope.pop('error', 'Database message', error.message, 5000);
                        });
                });
            };

            $scope.app = {
                name: 'Awery',
                version: '0.1',
                year: new Date().getFullYear()
            };

        }]);
