/*
 Copyright 2020 Esri

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

import AppBase from "./support/AppBase.js";
import AppLoader from "./loaders/AppLoader.js";
import Warehouses from "./Warehouses.js";
import FieldEngineers from "./FieldEngineers.js";
import DamageReports from "./DamageReports.js";
import ServiceAreaUtils from "./platform/ServiceAreaUtils.js";
import RouteUtils from "./platform/RouteUtils.js";
import ClosestFacilityUtils from "./platform/ClosestFacilityUtils.js";

class Application extends AppBase {

  // PORTAL //
  portal;

  constructor() {
    super();

    // LOAD APPLICATION BASE //
    super.load().then(() => {

      // APPLICATION LOADER //
      const applicationLoader = new AppLoader({app: this});
      applicationLoader.load().then(({portal, group, map, view}) => {
        //console.info(portal, group, map, view);

        // PORTAL //
        this.portal = portal;

        // APP TITLE //
        this.title = this.title || map?.portalItem?.title || 'Application';
        // APP DESCRIPTION //
        this.description = this.description || map?.portalItem?.description || group?.description || '...' || this.description;

        // APPLICATION //
        this.applicationReady({portal, group, map, view}).catch(this.displayError).then(() => {
          // HIDE APP LOADER //
          document.getElementById('app-loader').removeAttribute('active');
        });

      }).catch(this.displayError);
    }).catch(this.displayError);

  }

  /**
   *
   * @param view
   */
  configView(view) {
    return new Promise((resolve, reject) => {
      if (view) {
        require(['esri/widgets/Home'], (Home) => {

          //
          // CONFIGURE VIEW SPECIFIC STUFF HERE //
          //
          view.set({
            popup: {
              dockEnabled: true,
              dockOptions: {
                buttonEnabled: false,
                breakpoint: false,
                position: "top-right"
              }
            },
            highlightOptions: {
              color: '#ffffff',
              haloOpacity: 0.9,
              fillOpacity: 0.2
            },
            constraints: {snapToZoom: false}
          });

          // HOME //
          const home = new Home({view});
          view.ui.add(home, {position: 'top-left', index: 0});

          // VIEW UPDATING //
          const viewUpdating = document.getElementById('view-updating');
          this._watchUtils.init(view, 'updating', updating => {
            viewUpdating.toggleAttribute('active', updating);
          });

          resolve();
        });
      } else { resolve(); }
    });
  }

  /**
   *
   * @param portal
   * @param group
   * @param map
   * @param view
   * @returns {Promise}
   */
  applicationReady({portal, group, map, view}) {
    return new Promise(async (resolve, reject) => {
      // VIEW READY //
      this.configView(view).then(() => {

        // ROUTE UTILS //
        this.routeUtils = new RouteUtils({view});
        // SERVICE AREA UTILS //
        this.serviceAreaUtils = new ServiceAreaUtils({view});
        // CLOSEST FACILITY //
        this.closestFacilityUtils = new ClosestFacilityUtils({view});

        // WAREHOUSES //
        this.warehouses = new Warehouses({view});
        // FIELD ENGINEERS //
        this.fieldEngineers = new FieldEngineers({view});
        // DAMAGE REPORTS //
        this.damageReports = new DamageReports({view});

        Promise.all([
          this.warehouses.load(),
          this.fieldEngineers.load(),
          this.damageReports.load()
        ]).then(() => {

          this.initializeDirectionsUI();
          this.displayFieldEngineersList(view);
          this.initializeDamageReports(view);
          this.initializeServiceRequest(view);

          resolve();
        });
      }).catch(reject);
    });
  }

  /**
   *
   * ETA: -2209161600000
   * arriveTimeUTC: -2209161600000
   * length: 0
   * maneuverType: "esriDMTDepart"
   * text: "Start at Location 1"
   * time: 0
   */
  initializeDirectionsUI() {

    /**
     *
     * @param feature
     * @returns {HTMLLIElement}
     */
    const createDirectionNode = feature => {

      const details = (feature.attributes.time > 0.0)
        ? `<br>&nbsp;&nbsp;then continue for ${ feature.attributes.time.toFixed(1) } minutes`
        : ''

      const itemNode = document.createElement('li');
      itemNode.classList.add('direction-node');
      itemNode.innerHTML = `${ feature.attributes.text }${ details }`;

      return itemNode;
    };

    // DIRECTIONS INFO //
    const directionsInfo = document.getElementById('directions-info');

    // DIRECTIONS LIST //
    const directionsList = document.getElementById('directions-list');

    // ROUTE SOLVED //
    this.routeUtils.watch('results', routeResults => {

      // DETAILS //
      directionsInfo.innerHTML = routeResults
        ? `${ routeResults.directions.totalDriveTime.toFixed(1) } minutes | ${ routeResults.directions.totalLength.toFixed(1) } miles`
        : 'Directions';

      // DIRECTIONS //
      directionsList.innerHTML = '';
      if (routeResults) {
        this.togglePanel('directions-list', true);
        const directionsNodes = routeResults.directions.features.map(createDirectionNode);
        directionsList.append(...directionsNodes);
      }
    });

  }

  /**
   *
   * @param view
   */
  displayFieldEngineersList(view) {
    if (view) {
      require(['esri/geometry/Multipoint'], (Multipoint) => {

        //
        // ROUTE VIA WAREHOUSE
        //
        const warehouseSwitch = document.getElementById('warehouse-switch');

        // GET ZOOM EXTENT //
        const getZoomExtent = (features) => {
          const zoomGeom = new Multipoint({
            spatialReference: features[0].geometry.spatialReference,
            points: features.map(feature => [feature.geometry.x, feature.geometry.y])
          });
          return zoomGeom.extent.clone().expand(1.3)
        };

        let _fieldEngineerFeature = null;
        let _damageReportFeature = null;
        let _serviceAreaFeature = null;

        // DISPATCH FIELD ENGINEER //
        const dispatchFieldEngineer = () => {
          if (_fieldEngineerFeature && _damageReportFeature) {
            if (warehouseSwitch.switched) {
              this.closestFacilityUtils.getClosestFacility([_fieldEngineerFeature], this.warehouses.features).then(closestFacilityLocation => {
                this.routeUtils.getRoute({
                  startLocation: _fieldEngineerFeature.geometry,
                  stopLocation: closestFacilityLocation,
                  endLocation: _damageReportFeature.geometry
                });
              });
            } else {
              this.routeUtils.getRoute({
                startLocation: _fieldEngineerFeature.geometry,
                endLocation: _damageReportFeature.geometry
              });
            }
          }
        }

        // LIST OF ENGINEERS //
        const engineersList = document.getElementById('features-list');
        // ENGINEERS SELECTED //
        engineersList.addEventListener('calciteListChange', (evt) => {
          _fieldEngineerFeature = null;

          const featureOID = evt.detail.size ? Number(Array.from(evt.detail.keys())[0]) : null;
          const feature = this.fieldEngineers.getFeature(featureOID);
          if (_damageReportFeature) {
            const zoomExtent = getZoomExtent([_damageReportFeature, feature]);
            view.goTo({target: zoomExtent});
          } else {
            view.goTo({target: feature});
          }
        });

        const clearSelection = () => {
          engineersList.getSelectedItems().then(selectedItems => {
            selectedItems.forEach(selectedItem => {
              selectedItem.selected = false;
            });
          });
        };

        // OBJECTID FIELD //
        const objectIdField = this.fieldEngineers.objectIdField;

        // FEATURE ITEM TEMPLATE //
        const engineerItemTemplate = document.getElementById('feature-item-template');
        // CREATE ITEM NODE //
        const createFeatureItemNodes = (feature) => {
          const templateNode = engineerItemTemplate.content.cloneNode(true);

          const itemNode = templateNode.querySelector('calcite-pick-list-item');
          itemNode.setAttribute('label', this.fieldEngineers.getLabel(feature));
          itemNode.setAttribute('description', this.fieldEngineers.getDescription(feature));
          itemNode.setAttribute('value', feature.attributes[objectIdField]);
          itemNode.setAttribute('status', feature.attributes.Status);

          // ACTION NODE //
          const actionNode = itemNode.querySelector('calcite-action');
          // ACTION SELECTED //
          actionNode.addEventListener('click', () => {
            _fieldEngineerFeature = this.fieldEngineers.getFeature(Number(actionNode.parentNode.value));
            dispatchFieldEngineer();
          });

          return itemNode;
        };

        //
        // ROUTE VIA WAREHOUSE
        //
        warehouseSwitch.addEventListener('calciteSwitchChange', dispatchFieldEngineer);

        // WHEN FEATURES //
        this.fieldEngineers.watch('features', features => {
          // CREATE LIST OF ENGINEERS //
          engineersList.innerHTML = '';
          engineersList.append(...features.map(createFeatureItemNodes));
          engineersList.loading = false;
        });


        //
        // FIND ENGINEERS WITHIN SERVICE AREA //
        //
        this.serviceAreaUtils.watch('results', (results) => {
          _damageReportFeature = results?.sourceFeature;
          _serviceAreaFeature = results?.serviceAreaFeature;

          if (_serviceAreaFeature) {

            this.togglePanel('features-list', true);

            // FIND FIELD ENGINEERS WITHIN SERVICE AREA //
            this.fieldEngineers.getFeatures({geometry: _serviceAreaFeature.geometry}).then((features) => {
              if (features && features.length) {

                // NEARBY ENGINEERS //
                const nearbyEngineers = features.map(feature => feature.attributes.Engineer);

                this.fieldEngineers.featureLayerView.effect = {
                  filter: {
                    where: `(Engineer in ('${ nearbyEngineers.join("','") }'))`
                  },
                  excludedEffect: "grayscale(100%) opacity(50%)"
                };

                // ONLY ENABLE NEARBY ENGINEERS //
                engineersList.querySelectorAll('calcite-pick-list-item').forEach(pickListItem => {
                  const engineer = pickListItem.getAttribute('label');
                  pickListItem.toggleAttribute('nearby', nearbyEngineers.includes(engineer));
                });
              }
            });
          } else {
            clearSelection();
            this.fieldEngineers.featureLayerView.effect = null;
            engineersList.querySelectorAll('calcite-pick-list-item').forEach(pickListItem => {
              pickListItem.removeAttribute('nearby');
            });
          }
        });

      });

    }
  }

  /**
   *
   * @param view
   */
  initializeDamageReports(view) {
    if (view) {
      require(["esri/widgets/Feature"], (Feature) => {

        // INITIAL EXTENT //
        const initialExtent = view.extent.clone();

        // OBJECTID FIELD //
        const objectIdField = this.damageReports.objectIdField;

        // REPORT DETAILS //
        const reportDetails = new Feature({container: 'report-feature-node'});

        // LIST OF REPORTS //
        const reportsList = document.getElementById('reports-list');
        // REPORT SELECTED //
        reportsList.addEventListener('calciteListChange', (evt) => {

          clearResults();

          const featureOID = evt.detail.size ? Number(Array.from(evt.detail.keys())[0]) : null;
          if (featureOID) {
            const feature = this.damageReports.getFeature(featureOID);
            view.goTo({target: feature, zoom: 13}).then(() => {

              this.damageReports.featureLayerView.effect = {
                filter: {
                  objectIds: [feature.attributes[objectIdField]]
                },
                includedEffect: 'drop-shadow(2px, 2px, 6px)',
                excludedEffect: "opacity(60%)"
              };

              // REPORT DETAILS //
              reportDetails.graphic = feature;
            });
          } else {
            reportDetails.graphic = null;
            this.damageReports.featureLayerView.effect = null;
          }
        });

        const clearResults = () => {
          reportDetails.graphic = null;
          this.damageReports.featureLayerView.effect = null;
          this.routeUtils.clear();
          this.serviceAreaUtils.clear();
          this.togglePanel('features-list', true);
        };

        const clearSelection = () => {
          reportsList.getSelectedItems().then(selectedItems => {
            selectedItems.forEach(selectedItem => {
              selectedItem.selected = false;
            });
          });
        };

        // CLEAR ANALYSIS //
        const clearAnalysisAction = document.getElementById('clear-analysis-action');
        clearAnalysisAction.addEventListener('calciteActionClick', () => {
          reportDetails.graphic = null;
          clearSelection();
          clearResults();
          view.goTo(initialExtent);
        });

        // FEATURE ITEM TEMPLATE //
        const reportItemTemplate = document.getElementById('report-item-template');
        // CREATE ITEM NODE //
        const createFeatureItemNodes = (feature) => {
          const templateNode = reportItemTemplate.content.cloneNode(true);

          const itemNode = templateNode.querySelector('calcite-pick-list-item');
          itemNode.setAttribute('label', this.damageReports.getLabel(feature));
          itemNode.setAttribute('description', this.damageReports.getDescription(feature));
          itemNode.setAttribute('value', feature.attributes[objectIdField]);
          itemNode.setAttribute('status', 'report');

          // ACTION SELECTED //
          const actionNode = itemNode.querySelector('calcite-action');
          actionNode.addEventListener('click', () => {
            const feature = this.damageReports.getFeature(Number(actionNode.parentNode.value));
            this.serviceAreaUtils.getServiceArea(feature);
          });

          return itemNode;
        };

        // WHEN FEATURES //
        this.damageReports.watch('features', features => {
          // CREATE AND ADD FEATURE ITEMS //
          reportsList.innerHTML = '';
          reportsList.append(...features.map(createFeatureItemNodes));
          reportsList.loading = false;
        });

      });

    }
  }

  /**
   *
   * @param view
   */
  initializeServiceRequest(view) {
    require([
      'esri/Graphic',
      'esri/widgets/FeatureForm',
      'esri/widgets/Search'
    ], (Graphic, FeatureForm, Search) => {

      // NEW DAMAGE REPORT FEATURE //
      let newDamageReportFeature = null;

      // FEATURE FORM //
      const featureForm = new FeatureForm({
        container: 'feature-form-container',
        view: view,
        layer: this.damageReports.featureLayer
      });

      featureForm.on("submit", () => {
        if (newDamageReportFeature) {

          newDamageReportFeature.attributes = {
            ...newDamageReportFeature.attributes,
            ...featureForm.getValues()
          };

          this.damageReports.addDamageReport(newDamageReportFeature).then(({addResult}) => {
            if (!addResult.error) {
              search.clear();
              newDamageReportFeature = null;
              createReportPanel.setAttribute('hidden', null);
              this._evented.emit('damage-report-added', {});
            }
          });

        }
      });

      // CREATE REPORT BUTTON //
      const createReportBtn = document.getElementById('create-report-btn');
      createReportBtn.addEventListener('click', (clickEvt) => {
        featureForm.submit();
      });

      // CREATE REPORT PANEL //
      const createReportPanel = document.getElementById('create-report-panel');

      // DAMAGE TYPES //
      const damageTypes = [
        'Pole Leaning/Down',
        'Transformer Malfunctioning',
        'Sagging/Downed Wire',
        'Excavation Damage',
        'Nesting Wildlife',
        'Vegetation Encroachment',
        'Crossarm Damage'
      ];

      // SEARCH //
      const search = new Search({
        container: 'search-container',
        view: view,
        locationEnabled: false,
        popupEnabled: false
      });
      search.on('search-complete', (evt) => {
        if (evt.numResults) {
          const result = evt.results[0].results[0];

          /**
           6: "Damagetype ::: string"
           7: "damagelevel ::: string"
           8: "Name ::: string"
           9: "customers ::: integer"
           10: "reportdate ::: date"
           11: "reporttime ::: string"
           */

          const damageLevel = 'Critical';
          const damageType = damageTypes[Math.floor(Math.random() * damageTypes.length)];
          const today = new Date();

          newDamageReportFeature = new Graphic({
            geometry: result.feature.geometry,
            attributes: {
              Name: `${ damageType } at ${ result.name }`,
              Damagetype: damageType,
              damagelevel: damageLevel,
              customers: Math.floor(1 + (Math.random() * 149)),
              reportdate: today.valueOf(),
              reporttime: today.toLocaleTimeString('default', {hour: '2-digit', minute: '2-digit'})
            }
          });

          featureForm.feature = newDamageReportFeature;
          createReportPanel.removeAttribute('hidden');

        } else {
          createReportPanel.setAttribute('hidden', null);
        }
      });


      search.viewModel.when(() => {

        const locator = search.sources[0].locator;
        console.info(locator);

        view.on('click', clickEvt => {
          locator.locationToAddress({}).then(locatorResults => {

            console.info(locatorResults)

          });
        });
      });


    });
  }

}

export default new Application();
