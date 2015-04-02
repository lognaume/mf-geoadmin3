(function() {
  goog.provide('ga_draw_directive');

  goog.require('ga_export_kml_service');
  goog.require('ga_map_service');

  var module = angular.module('ga_draw_directive', [
    'ga_export_kml_service',
    'ga_map_service',
    'pascalprecht.translate'
  ]);

  module.directive('gaDraw',
    function($timeout, $translate, $window, $rootScope, gaBrowserSniffer,
        gaDefinePropertiesForLayer, gaDebounce, gaLayerFilters, gaExportKml,
        gaMapUtils) {
      return {
        restrict: 'A',
        templateUrl: 'components/draw/partials/draw.html',
        scope: {
          map: '=gaDrawMap',
          options: '=gaDrawOptions',
          isActive: '=gaDrawActive'
        },
        link: function(scope, element, attrs, controller) {
          var draw, lastActiveTool;
          var map = scope.map;
          var source = new ol.source.Vector();
          var layer = new ol.layer.Vector({
            source: source,
            visible: true
          });
          var overlay = new ol.Overlay({
            offset: [0, -15],
            positioning: 'bottom-center'
          });
          var props = $('.ga-draw-modify');
          gaDefinePropertiesForLayer(layer);
          layer.displayInLayerManager = false;
          scope.layers = scope.map.getLayers().getArray();
          scope.layerFilter = gaLayerFilters.selected;

          if (scope.options.broadcastLayer) {
            $rootScope.$broadcast('gaDrawingLayer', layer);
          }

          // Add select interaction
          var select = new ol.interaction.Select({
            layers: [layer],
            style: scope.options.selectStyleFunction,
            multi: false
          });
          var propsToggle = function(feature) {
            if (feature) {
              if (!overlay.getElement()) {
                overlay.setElement(props[0]);
              }
              props.show();
              var coord, geom = feature.getGeometry();
              if (geom instanceof ol.geom.Polygon) {
                coord = geom.getInteriorPoint().getCoordinates();
              } else {
                coord = geom.getLastCoordinate();
              }
              overlay.setPosition(coord);
            } else {
              props.hide();
              overlay.setPosition(undefined);
            }
          };
          select.getFeatures().on('add', function(evt) {
            // Apply the select style
            var styles = scope.options.selectStyleFunction(evt.element);
            evt.element.setStyle(styles);
            updateUseStyles(evt);
            propsToggle(evt.element);
            console.debug('add');
          });
          select.getFeatures().on('remove', function(evt) {
            // Remove the select style
            var styles = evt.element.getStyle();
            styles.pop();
            evt.element.setStyle(styles);
            //updateUseStyles(evt);
            propsToggle();
            console.debug('remove');

          });
          select.setActive(false);
          map.addInteraction(select);

          // Add modify interaction
          var modify = new ol.interaction.Modify({
            features: select.getFeatures(),
            style: scope.options.selectStyleFunction
          });
          modify.setActive(false);
          map.addInteraction(modify);

          // Activate the component 
          var activate = function() {
            if (map.getLayers().getArray().indexOf(layer) == -1) {
              map.addLayer(layer);
              // Move draw layer on each changes in the list of layers
              // in the layer manager.
              scope.$watchCollection('layers | filter:layerFilter', function() {
                gaMapUtils.moveLayerOnTop(map, layer);
              });
            }
            map.addOverlay(overlay);
            activateSelectInteraction();
          };

          // Deactivate the component: remove layer and interactions.
          var deactivate = function() {
            deactivateDrawInteraction();
            deactivateSelectInteraction();
            map.removeOverlay(overlay);
          };

          // Deactivate other tools
          var activateTool = function(tool) {
            layer.visible = true;
            gaMapUtils.moveLayerOnTop(map, layer);
            lastActiveTool = tool;
            var tools = scope.options.tools;
            for (var i = 0, ii = tools.length; i < ii; i++) {
              scope.options[tools[i].activeKey] = (tools[i].id == tool.id);
            }
          };
          
          var deactivateTool = function(tool) {
            scope.options[tool.activeKey] = false;
          };

          // Set the draw interaction with the good geometry
          var deregDrawStart, deregDrawEnd;
          var activateDrawInteraction = function(type) {
            deactivateSelectInteraction();
            deactivateDrawInteraction();

            draw = new ol.interaction.Draw({
              type: type,
              source: source,
              style: scope.options.drawStyleFunction
            });

            deregDrawEnd = draw.on('drawend', function(evt) {
             
              // Set the definitve style of the feature
              var styles = scope.options.styleFunction(evt.feature);
              evt.feature.setStyle(styles);
              scope.$apply();
              deactivateDrawInteraction();
              deactivateTool(lastActiveTool);
              activateSelectInteraction();
              select.getFeatures().push(evt.feature);
            });
            map.addInteraction(draw);
          };
          var deactivateDrawInteraction = function() {
            ol.Observable.unByKey(deregDrawStart);
            ol.Observable.unByKey(deregDrawEnd);
            map.removeInteraction(draw);
          };


          // Activate/Deactivate select interaction
          var deregPointerMove;
          var activateSelectInteraction = function() {
            select.setActive(true);
            if (!gaBrowserSniffer.mobile) {
              deregPointerMove = map.on('pointermove', updateCursorStyleDebounced);
            }
            activateModifyInteraction();
          };
          var deactivateSelectInteraction = function() {
            deactivateModifyInteraction();
            if (deregPointerMove) {
              ol.Observable.unByKey(deregPointerMove, updateCursorStyleDebounced);
            }
            select.getFeatures().clear();
            select.setActive(false);
          };

          // Activate/Deactivate modifiy interaction
          var activateModifyInteraction = function() {
            modify.setActive(true);
          };

          var deactivateModifyInteraction = function() {
            modify.setActive(false);
          };


          // Update selected feature with a new style
          var updateSelectedFeatures = function() {
            if (select.getActive()) {
              var features = select.getFeatures();
              if (features) {
                features.forEach(function(feature) {
                  // Update the style of the feature with the current style
                  feature.setStyle(function() {return null;});
                  var styles = scope.options.styleFunction(feature);
                  feature.setStyle(styles);
                  // then apply the select style
                  styles = scope.options.selectStyleFunction(feature);
                  feature.setStyle(styles);
                });
              }
            }
          };


          // Determines which styles are used by selected features
          var updateUseStyles = function(evt) {
            var features = select.getFeatures().getArray();
            var useTextStyle = false;
            var useIconStyle = false;
            var useColorStyle = false;
            
            // The select interaction select only one feature
            for (var i = 0, ii = features.length; i < ii; i++) {
              var styles = features[i].getStyleFunction()();
              var featStyle = styles[0];
              if (featStyle.getImage() instanceof ol.style.Icon) {
                useIconStyle = true;

                // Update html inputs.
                scope.options.icon = findIcon(featStyle.getImage());
                scope.options.iconSize = findIconSize(featStyle.getImage());
                continue;

              } else if (featStyle.getText()) {
                useTextStyle = true;

                // Update html inputs
                scope.options.text = featStyle.getText().getText();
                scope.options.color = findColor(featStyle.getText().getFill().getColor());

              } else {

                // Update html inputs
                if (featStyle.getStroke()) {
                  scope.options.color = findColor(featStyle.getStroke().getColor());
                }
              }
              useColorStyle = true;
            }
            if (features.length) {
              scope.options.description = features[0].get('description') || '';
            }
            scope.$evalAsync(function() {
              scope.useTextStyle = useTextStyle;
              scope.useIconStyle = useIconStyle;
              scope.useColorStyle = useColorStyle;
            });
          };

          // Delete all features of the layer
          scope.deleteAllFeatures = function() {
            if (confirm($translate.instant('confirm_remove_all_features'))) {
              layer.getSource().clear();
            }
          };

          // Activate/deactivate a tool
          scope.toggleTool = function(evt, tool) {
            if (scope.options[tool.activeKey]) {
              // Deactivate all tools
              deactivate();
              lastActiveTool = undefined;
            } else {
              activateTool(tool);
            }
            evt.preventDefault();
          };

          scope.exportKml = function(evt) {
            gaExportKml.createAndDownload(layer, map.getView().getProjection());
            evt.preventDefault();
          };

          scope.canExport = function() {
            return source.getFeatures().length > 0;
          };

          scope.aToolIsActive = function() {
            return !!lastActiveTool;
          };

          // hide the overlay with close button
          scope.hide = function() {
            overlay.setPosition(undefined);
          };

          // Watchers
          scope.$watch('isActive', function(active) {
            if (active) {
              activate();
            } else {
              deactivate();
            }
          });

          scope.$watchGroup(['options.iconSize', 'options.icon',
              'options.color', 'options.text', 'options.description'],
              function() {
            updateSelectedFeatures();
          });

          scope.$watch('options.isPointActive', function(active) {
            if (active) {
              activateDrawInteraction('Point');
            }
          });
          scope.$watch('options.isLineActive', function(active) {
            if (active) {
              activateDrawInteraction('LineString');
            }
          });
          scope.$watch('options.isPolygonActive', function(active) {
            if (active) {
              activateDrawInteraction('Polygon');
            }
          });

          $rootScope.$on('$translateChangeEnd', function() {
            layer.label = $translate.instant('draw');
          });

          // Utils

          // Find the corresponding style
          var findIcon = function(olIcon) {
            var id = olIcon.getSrc();
            for (var i = 0; i < scope.options.icons.length; i++) {
              var regex = new RegExp('/' + scope.options.icons[i].id + '-24');
              if (regex.test(id)) {
                return scope.options.icons[i];
              }
            }
            return scope.options.iconSizes[0];
          };

          var findIconSize = function(olIcon) {
            var scale = olIcon.getScale();
            for (var i = 0; i < scope.options.iconSizes.length; i++) {
              if (scale == scope.options.iconSizes[i].scale) {
                return scope.options.iconSizes[i];
              }
            }
            return scope.options.iconSizes[0];
          };

          var findColor = function(olColor) {
            var rgb = ol.color.asString(olColor.slice(0, 3));
            for (var i = 0; i < scope.options.colors.length; i++) {
              if (rgb == ol.color.asString(scope.options.colors[i].fill)) {
                return scope.options.colors[i];
              }
            }
            return scope.options.colors[0];
          };

          // Change cursor style on mouse move, only on desktop
          var updateCursorStyle = function(evt) {
            var featureFound;
            map.forEachFeatureAtPixel(evt.pixel, function(feature, olLayer) {
              featureFound = feature;
            }, this, function(olLayer) {
              return (layer == olLayer);
            });
            map.getTarget().style.cursor = (featureFound) ? 'pointer' : '';
          };
          var updateCursorStyleDebounced = gaDebounce.debounce(
              updateCursorStyle, 10, false, false);

          // Focus on the first input.
          /*var setFocus = function() {
            $timeout(function() {
              var inputs = element.find('input, select');
              if (inputs.length > 0) {
                inputs[0].focus();
              }
            });
          };*/
        }
      };
    }
  );
})();
