
function padNumber(num, len = 2, padding = '0'){
  return num.toString().padStart(len, padding);
}

function dateTime(date = new Date()){
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())} ${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`;
}

function log(...args){
  console.log(`\x1b[1m\x1b[37m[log][${dateTime()}]\x1b[0m`, ...args);
}

function info(...args){
  console.info(`\x1b[1m\x1b[36m[info][${dateTime()}]\x1b[0m`, ...args);
}

function debug(...args){
  console.debug(`\x1b[1m\x1b[34m[debug][${dateTime()}]\x1b[0m`, ...args);
}

function warn(...args){
  console.warn(`\x1b[1m\x1b[33m[warning][${dateTime()}]\x1b[0m`, ...args);
}

function error(...args){
  console.error(`\x1b[1m\x1b[31m[error][${dateTime()}]\x1b[0m`, ...args);
}

module.exports = {
  padNumber,
  dateTime,
  log,
  info,
  debug,
  warn,
  error,
};
