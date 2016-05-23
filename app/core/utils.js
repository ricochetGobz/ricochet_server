/**
*
* app/core/utils.js
* All of your utils functions
*
**/

import adrs from './addresses';

const util = {
  logError: (message) => {
    console.warn(`
      ##### ERROR
    ${message}
    `);
  },
  logDate: (message) => {
    console.log(`${new Date()} ${message}`);
  },
  isJSON: (str) => {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  },
  addressExist: (adr) => {
    for (const key in adrs) {
      if (adrs[key] === adr) return true;
    }
    return false;
  },
};

module.exports = util;
