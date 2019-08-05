function padNumber(num, len = 2, padding = '0'){
  return num.toString().padStart(len, padding);
}

module.exports = {
  padNumber,
};
