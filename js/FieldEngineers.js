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

import MapFeatureLayer from "./MapFeatureLayer.js";

/**
 *
 * FieldEngineers
 *  - Field Engineers
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  6/9/2021 - 0.0.1 -
 * Modified:
 *
 */

class FieldEngineers extends MapFeatureLayer {

  constructor({view}) {
    super({
      view: view,
      title: 'Field Engineer',
      filter: {
        outFields: ['OBJECTID', 'Engineer', 'Skill', 'Status'],
        orderByFields: ['Status DESC', 'Skill ASC']
      }
    });
  }

  /**
   *
   * @param feature
   * @returns {String}
   */
  getLabel(feature) {
    return feature.attributes.Engineer;
  }

  /**
   *
   * @param feature
   * @returns {String}
   */
  getDescription(feature) {

    /*const details = [
     `${ feature.attributes.Skill } Engineer`,
     `Status: ${ feature.attributes.Status }`
     ];
     return details.join('<br>');*/

    return `[${ feature.attributes.Skill }] Status: ${ feature.attributes.Status }`;

  }

}

export default FieldEngineers;
