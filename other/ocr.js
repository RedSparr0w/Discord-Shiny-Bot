const { recognize } = require('node-tesseract-ocr');
const { debug } = require('../helpers.js');
let tesseractInstalled = false;
(async () => {
  try {
    const util = require('util');
    const exec = util.promisify(require('child_process').exec);
    tesseractInstalled = !!(await exec('tesseract --version'));
  } catch (e) {
    tesseractInstalled = false;
  }
  debug('Tesseract Installed:', tesseractInstalled);
})();

const extractMessageDate = async (files) => {
  // Check if tesseract installed
  if (!tesseractInstalled) return new Date(0);
  // Proccess the data
  try {
    let output = '';
    for (const file of files) {
      output += await recognize(file, {
        tessedit_char_whitelist: '0123456789-/',
      }).catch(e=>{});
    }
    output = output?.split('\n').join(' ');

    let [month, day, year] = (output.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})/i)?.[0] || '').split(/[-/]/);

    if (day == undefined || month == undefined || year == undefined) {
      [year, month, day] = (output.match(/(\d{4}-\d{1,2}-\d{1,2})/i)?.[0] || '').split(/[-/]/);
    }

    const now = new Date();
    const date1 = new Date(`${year}-${month}-${day}`);
    const date2 = new Date(`${year}-${day}-${month}`);

    // If date1 invalid, assume date2
    // If date2 invalid, assume date1
    // If both valid dates, use the date that is the closest to today
    const date = isNaN(date1) ? date2 : isNaN(date2) || Math.abs(now - +date1) < Math.abs(now - +date2) ? date1 : date2;

    // Return 0 date or date we got
    return !+date ? new Date(0) : date;
  } catch(e){
    return new Date(0);
  }
};

module.exports = {
  extractMessageDate,
};
