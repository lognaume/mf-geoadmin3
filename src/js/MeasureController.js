(function() {
  goog.provide('ga_measure_controller');

  goog.require('ga_urlutils_service');

  var module = angular.module('ga_measure_controller', [
    'ga_urlutils_service',
    'pascalprecht.translate'
  ]);
  module.controller('GaMeasureController',
      function($scope, $translate, $q, $http, $rootScope, $window, $timeout,
          gaBrowserSniffer, gaGlobalOptions, gaUrlUtils, gaPrintService) {
        $scope.options = {
          isProfileActive: false,
          profileUrl: gaGlobalOptions.apiUrl + '/rest/services/profile.json',
          profileOptions: {
              xLabel: 'profile_x_label',
              yLabel: 'profile_y_label',
              margin: {
                top: 20,
                right: 20,
                bottom: 40,
                left: 60
              },
              height: 188,
              elevationModel: 'COMB'
          },
          styleFunction: (function() {
            var styles = {};

            var stroke = new ol.style.Stroke({
              color: [255, 0, 0, 1],
              width: 3
            });
            
            var strokeDashed = new ol.style.Stroke({
              color: [255, 0, 0, 1],
              width: 3,
              lineDash: [8]
            });
            var fill = new ol.style.Fill({
              color: [255, 0, 0, 0.4]
            })

            styles['Polygon'] = [
              new ol.style.Style({
                fill: fill,
                stroke: strokeDashed
              })
            ];

            styles['LineString'] = [
              new ol.style.Style({
                stroke: strokeDashed
              })
            ];

            styles['Point'] = [
              new ol.style.Style({
                image: new ol.style.Circle({
                  radius: 4,
                  fill: fill,
                  stroke: stroke
                })
              })
            ];

            styles['Circle'] = [
              new ol.style.Style({
                stroke: stroke
              })
            ];
            
            return function(feature, resolution) {
                return styles[feature.getGeometry().getType()];
            };
          })()
        };

        $scope.options.drawStyleFunction = (function() {
          var drawStylePolygon = [new ol.style.Style({
            fill: new ol.style.Fill({
              color: [255, 255, 255, 0.4]
            }),
            stroke: new ol.style.Stroke({
              color: [255, 255, 255, 0],
              width: 0
            })
          })];

          return function(feature, resolution) {
            if (feature.getGeometry().getType() === 'Polygon') {
              return drawStylePolygon;
            } else {
              return $scope.options.styleFunction(feature, resolution);
            }
          }
        })();

        var canceler;
        var cancel = function() {
          if (canceler !== undefined) {
            canceler.resolve();
            canceler = undefined;
          }
        };
        
        var win = $($window);
        var isProfileCreated = false;
        var getProfile = function(feature, callback) {
          var coordinates = feature.getGeometry().getCoordinates();
          var wkt = '{"type":"LineString","coordinates":' +
                    angular.toJson(coordinates) + '}'; 
          var url = $scope.options.profileUrl + '?geom=' +
                    gaUrlUtils.encodeUriQuery(wkt) + '&elevation_models=' +
                    $scope.options.profileOptions.elevationModel;

          //cancel old request
          cancel();
          canceler = $q.defer();

          $http.get(url, {
            cache: true,
            timeout: canceler.promise
          }).success(callback)
            .error(function(data, status) {
              // If request is canceled, statuscode is 0 and we don't announce it
              if (status !== 0) {
                // Display an empty profile
                callback([{alts:{COMB: 0}, dist: 0}], status);
              }
            });
        };

       var createProfile = function(data, status) {
          isProfileCreated = true;
          // Profile width is dynamic, so before the first loading we must 
          // set the good value.
          // 32 is the padding and margin of the popup.
          $scope.options.profileOptions.width = win.width() - $('[ga-measure]').width() - 32;
          $rootScope.$emit('gaProfileDataLoaded', data);
        };

        var updateProfile = function(data, status) {
          $rootScope.$emit('gaProfileDataUpdated', data);
        };

        $scope.options.drawProfile = function(feature) {
          if (!isProfileCreated) {
            getProfile(feature, createProfile);
          } else {
            getProfile(feature, updateProfile);
          }
        }

        var panel;
        var panelBt;
        win.on('resize', function() {
          if (isProfileCreated) {
            if (!panel) {
              panel = $('.ga-measure-panel-group');
            }
            // 47 padding and margins
            $scope.options.profileOptions.width = win.width() - panel.width() - 47;
            $rootScope.$emit('gaProfileDataUpdated', null, [
              $scope.options.profileOptions.width,
              $scope.options.profileOptions.height
            ]);
          }
        });

        // Allow to print dynamic profile from measure popup
        $scope.print = function() {
          var contentEl = $('#measure-popup .ga-popup-content');
          var onLoad = function(printWindow) {
            var profile = $(printWindow.document).find('[ga-profile]');
            // HACK IE, for some obscure reason an A4 page in IE is not
            // 600 pixels width so calculation of the scale is not optimal.
            var b = (gaBrowserSniffer.msie) ? 1000 : 600;
            // Same IE mistery here, a js error occurs using jQuery width() function.
            var a = parseInt(profile.find('svg').attr('width'), 10);
            var scale = b / a;
            profile.css({
              position: 'absolute',
              left: (-(a - a * scale) / 2) + 'px',
              top: '200px',
              transform: 'scale(' + scale + ')'
            });
            printWindow.print();
          }
          $timeout(function() {
            gaPrintService.htmlPrintout(contentEl.clone().html(), undefined, onLoad);
          }, 0, false);
        }; 
      });
})();
