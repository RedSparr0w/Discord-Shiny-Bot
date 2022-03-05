const { recognize } = require('node-tesseract-ocr');

const extractMessageDate = async (msg, files) => {
  try {
    let output = '';
    for (const file of files) {
      output += await recognize(file, {}).catch(e=>{});
    }
    output = output?.split('\n').join(' ');

    let [month, day, year] = (output.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4})/i) || [''])?.[0]?.split(/[-/]/);

    if (day == undefined || month == undefined || year == undefined) {
      [year, month, day] = (output.match(/(\d{4}-\d{1,2}-\d{1,2})/i) || [''])?.[0]?.split(/[-/]/);
    }

    const now = new Date();
    const date1 = new Date(`${year}-${month}-${day}`);
    const date2 = new Date(`${year}-${day}-${month}`);
    console.log(date1, date2, now);
    // If date1 invalid, assume date2
    // If date2 invalid, assume date1
    // If both valid dates, use the date that is the closest to today
    const date = isNaN(date1) ? date2 : isNaN(date2) || Math.abs(now - +date1) < Math.abs(now - +date2) ? date1 : date2;
    console.log(date);
    if (!+date) return;

    const lines = msg.embeds[0].description.split('\n');
    lines.splice(1, 0, `**Date:** ${date.toLocaleString('en-us', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`);
    msg.embeds[0].setDescription(lines.join('\n'));
    msg.edit({ embeds: msg.embeds }).catch(e=>{});
  } catch(e){}
};

module.exports = {
  extractMessageDate,
};
