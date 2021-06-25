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
 * RouteUtils
 *  - Route Utils
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  6/9/2021 - 0.0.1 -
 * Modified:
 *
 */

class RouteUtils extends Watchable {

  view;
  routeTask;
  routeGraphic;
  results;

  constructor({view}) {
    super();

    this.view = view;

    require([
      'esri/Graphic',
      'esri/layers/GraphicsLayer',
      "esri/tasks/RouteTask"
    ], (Graphic, GraphicsLayer, RouteTask) => {

      // ROUTE RESULTS //
      this.routeGraphic = new Graphic({
        symbol: {
          type: 'simple-line',
          color: '#c93100',
          width: '5.5pt'
        }
      });
      const routeLayer = new GraphicsLayer({title: 'ROUTE RESULTS', graphics: [this.routeGraphic]});
      view.map.add(routeLayer, 1);

      this.routeTask = new RouteTask({
        url: "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World/solve"
      });

    });

  }

  /**
   *
   */
  clear() {
    this.routeGraphic.geometry = null;
    this.results = null;
  }

  /**
   *
   * @param startLocation { Point }
   * @param stopLocation{ Point] }
   * @param endLocation { Point }
   */
  getRoute({startLocation, stopLocation, endLocation}) {
    require([
      "esri/tasks/support/FeatureSet",
      "esri/tasks/support/RouteParameters"
    ], (FeatureSet, RouteParameters) => {

      const allStopLocations = [];
      startLocation && allStopLocations.push({geometry: startLocation, attributes: {'name': 'Field Engineer Location'}});
      stopLocation && allStopLocations.push({geometry: stopLocation, attributes: {'name': 'Warehouse Location'}});
      endLocation && allStopLocations.push({geometry: endLocation, attributes: {'name': 'Damage Report Location'}});

      if (allStopLocations.length > 1) {

        const routeParams = new RouteParameters({
          outSpatialReference: this.view.spatialReference,
          outputLines: 'true-shape',
          findBestSequence: false,
          preserveFirstStop: true,
          preserveLastStop: true,
          returnDirections: true,
          stops: new FeatureSet({features: allStopLocations})
        });
        this.routeTask.solve(routeParams).then(routeResponse => {
          const routeResults = routeResponse.routeResults[0];
          this.routeGraphic.geometry = routeResults.route.geometry;
          this.view.goTo({target: this.routeGraphic.geometry.extent.clone().expand(1.3)});
          this.results = routeResults;
        });

      }
    });
  }

}

export default RouteUtils;
