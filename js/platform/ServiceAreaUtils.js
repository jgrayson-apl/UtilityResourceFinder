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
 * ServiceAreaUtils
 *  - Service Area Utils
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  6/9/2021 - 0.0.1 -
 * Modified:
 *
 */

class ServiceAreaUtils extends Watchable {

  view;
  serviceAreaTask;
  serviceAreaGraphic;
  results;

  constructor({view}) {
    super();

    this.view = view;

    require([
      'esri/Graphic',
      'esri/layers/GraphicsLayer',
      "esri/tasks/ServiceAreaTask"
    ], (Graphic, GraphicsLayer, ServiceAreaTask) => {

      // SERVICE AREA RESULTS //
      this.serviceAreaGraphic = new Graphic({
        symbol: {
          type: 'simple-fill',
          color: 'rgba(162,110,204,0.1)',
          outline: {color: '#5d3e77', width: '1.2pt'}
        }
      });
      const serviceAreaLayer = new GraphicsLayer({title: 'SERVICE AREA RESULTS', graphics: [this.serviceAreaGraphic]});
      view.map.add(serviceAreaLayer, 1);

      // SERVICE AREA TASK //
      this.serviceAreaTask = new ServiceAreaTask({
        url: 'https://route-api.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World/solveServiceArea'
      });

    });

  }

  /**
   *
   */
  clear() {
    this.serviceAreaGraphic.geometry = null;
    this.results = null;
  }

  /**
   * GET SERVICE AREA
   *
   * FacilityID: 1
   * FromBreak: 0
   * Name: "Cherrington Incident : 0 - 5"
   * ObjectID: 1
   * ToBreak: 5
   *
   * @param sourceFeature
   */
  getServiceArea(sourceFeature) {
    require([
      "esri/tasks/support/FeatureSet",
      "esri/tasks/support/ServiceAreaParameters"
    ], (FeatureSet, ServiceAreaParameters) => {

      // SERVICE AREA PARAMS //
      const serviceAreaParams = new ServiceAreaParameters({
        outSpatialReference: this.view.spatialReference,
        defaultBreaks: [5],
        travelDirection: 'to-facility',
        outputPolygons: 'simplified',
        facilities: new FeatureSet({features: [sourceFeature]})
      });

      // GET SERVICE AREA //
      this.serviceAreaTask.solve(serviceAreaParams).then(serviceAreaResults => {
        const serviceAreaFeature = serviceAreaResults.serviceAreaPolygons[0];
        this.serviceAreaGraphic.geometry = serviceAreaFeature.geometry;
        this.view.goTo({target: this.serviceAreaGraphic.geometry});
        this.results = {sourceFeature, serviceAreaFeature};
      }).catch(console.error);
    });

  }

}

export default ServiceAreaUtils;
