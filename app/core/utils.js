/**
*
* app/core/utils.js
* All of your utils functions
*
**/

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
};

module.exports = util;
