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
 * DamageReports
 *  - Damage Reports
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  6/9/2021 - 0.0.1 -
 * Modified:
 *
 */

class DamageReports extends MapFeatureLayer {

  dateFormatter = new Intl.DateTimeFormat('default', {month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'});

  constructor({view}) {
    super({
      view: view,
      title: 'Damage Report',
      filter: {
        outFields: ['OBJECTID', 'Damagetype', 'damagelevel', 'Name', 'customers', 'reportdate', 'reporttime'],
        orderByFields: ['reportdate DESC', 'damagelevel ASC']
      }
    });
  }

  /**
   *
   * @param feature
   * @returns {String}
   */
  getLabel(feature) {
    return feature.attributes.Name;
  }

  /**
   *
   * @param feature
   * @returns {String}
   */
  getDescription(feature) {

    /*const details = [
     `Type: ${ feature.attributes.Damagetype }`,
     `Impacted Customers: ${ feature.attributes.customers }`,
     `Reported on ${ (new Date(feature.attributes.reportdate)).toLocaleString() }`
     ];
     return details.join('<br>');*/

    const dateLabel = this.dateFormatter.format(new Date(feature.attributes.reportdate));

    return `[${ dateLabel }] ${ feature.attributes.Damagetype }`;

  }

  /**
   *
   * @param newDamageReportFeature
   */
  addDamageReport(newDamageReportFeature) {
    return new Promise((resolve, reject) => {
      this.featureLayer.applyEdits({addFeatures: [newDamageReportFeature]}).then(editResults => {
        const addResult = editResults.addFeatureResults[0];
        if (addResult.error) {
          reject(addResult.error);
        } else {
          this.getAllFeatures().then(() => {
            resolve({addResult});
          });
        }
      }).catch(reject);
    });
  }

}

export default DamageReports;
