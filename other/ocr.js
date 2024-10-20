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
  const errorDate = new Date(0);
  // Check if tesseract installed
  if (!tesseractInstalled) return errorDate;
  // Proccess the data
  try {
    // Get out numbers and /- characters from out image
    let output = '';
    for (const file of files) {
      output += await recognize(file, {
        tessedit_char_whitelist: '0123456789-/.: ',
      }).catch(e=>{});
    }
    output = output?.split('\n').join(' ');

    // Try find a date in the text
    let [month, day, year] = (output.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}|\d{1,2}\.\d{1,2}\.\d{4})/i)?.[0] || '').split(/[-/.]/);

    // If no date, try with year first
    if (day == undefined || month == undefined || year == undefined) {
      [year, month, day] = (output.match(/(\d{4}-\d{1,2}-\d{1,2})/i)?.[0] || '').split(/[-/]/);
    }

    // If no day/month still, just return. If there's no year, we'll use the current year
    if (day == undefined || month == undefined) {
      return errorDate;
    }

    // Let's get some dates to compare against
    const now = new Date();

    let tomorrow = new Date();
      tomorrow.setDate(now.getDate() + 1); // Add a day to get tomorrow

    // If no year, use current year
    if (year == undefined) {
        year = now.getFullYear();
    } else {
      const lastYear = now.getFullYear() - 1; // Last year

      const yearInt = parseInt(year); // Convert year text to int

      //Check if the year makes sense and if not, set it to the current year
      if (yearInt < lastYear || yearInt > tomorrow.getFullYear()) {
        year = now.getFullYear();
      }
    }


    // Calculate date with month/day swapped around
    const date1 = new Date(`${year}-${month}-${day}`);
    const date2 = new Date(`${year}-${day}-${month}`);

    // If both dates are too far in the future or invalid, assume it's wrong
    if ((!+date1 || date1 > tomorrow) && (!+date2  || date2 > tomorrow)) {
      return errorDate;
    }

    // If date1 invalid, assume date2
    // If date2 invalid, assume date1
    // If both valid dates, use the date that is the closest to tomorrow, but not after tomorrow
    const date = isNaN(date1) ? date2 : isNaN(date2) || Math.abs(tomorrow - +date1) < Math.abs(tomorrow - +date2) && date1 <= tomorrow ? date1 : date2;

    // Return 0 date or date we got
    return !+date ? errorDate : date;
  } catch(e){
    return errorDate;
  }
};

module.exports = {
  extractMessageDate,
};
