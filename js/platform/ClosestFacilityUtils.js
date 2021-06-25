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

import Watchable from "../support/Watchable.js";

/**
 *
 * ClosestFacilityUtils
 *  - Closest Facility Utils
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  6/10/2021 - 0.0.1 -
 * Modified:
 *
 */

class ClosestFacilityUtils extends Watchable {

  view;
  closestFacilityTask;
  closestFacilityGraphic;
  results;

  constructor({view}) {
    super();

    this.view = view;

    require([
      'esri/Graphic',
      'esri/layers/GraphicsLayer',
      "esri/tasks/ClosestFacilityTask"
    ], (Graphic, GraphicsLayer, ClosestFacilityTask) => {

      // CLOSEST FACILITY RESULTS //
      this.closestFacilityGraphic = new Graphic({
        symbol: {
          type: 'simple-marker',
          color: '#ffffff',
          outline: {color: '#ff0000', width: '1.2pt'}
        }
      });
      const closestFacilityLayer = new GraphicsLayer({title: 'CLOSEST FACILITY RESULTS', graphics: [this.closestFacilityGraphic]});
      view.map.add(closestFacilityLayer, 1);

      // CLOSEST FACILITY TASK //
      this.closestFacilityTask = new ClosestFacilityTask({
        url: 'https://route-api.arcgis.com/arcgis/rest/services/World/ClosestFacility/NAServer/ClosestFacility_World/solveClosestFacility'
      });

    });

  }

  /**
   *
   */
  clear() {
    this.closestFacilityGraphic.geometry = null;
    this.results = null;
  }

  /**
   * GET CLOSEST FACILITY
   *
   * @param incidentFeatures
   * @param facilityFeatures
   * @returns {Promise}
   */
  getClosestFacility(incidentFeatures, facilityFeatures) {
    return new Promise((resolve, reject) => {
      require([
        "esri/tasks/support/FeatureSet",
        "esri/tasks/support/ClosestFacilityParameters"
      ], (FeatureSet, ClosestFacilityParameters) => {

        // CLOSEST FACILITY PARAMS //
        const serviceAreaParams = new ClosestFacilityParameters({
          outSpatialReference: this.view.spatialReference,
          returnIncidents: false,
          returnFacilities: true,
          returnDirections: false,
          returnRoutes: true,
          defaultTargetFacilityCount: 1,
          incidents: new FeatureSet({features: facilityFeatures}),
          facilities: new FeatureSet({features: incidentFeatures})
        });

        // CLOSEST FACILITY AREA //
        this.closestFacilityTask.solve(serviceAreaParams).then(closestFacilityResults => {

          const closestFacilityRoute = closestFacilityResults.routes[0];
          const closestFacilityLocation = closestFacilityRoute.geometry.getPoint(0, 0);
          this.results = {closestFacilityLocation};

          resolve(closestFacilityLocation);
        }).catch(console.error);
      });
    });
  }

}

export default ClosestFacilityUtils;
