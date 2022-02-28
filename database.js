const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const { backupChannelID } = require('./config.js');
const { MessageAttachment } = require('discord.js');
const { warn, info } = require('./helpers/logging.js');
const { version: botVersion } = require('./package.json');
const { consoleProgress } = require('./helpers/functions.js');

// current version, possibly older version
// eslint-disable-next-line no-unused-vars
const isOlderVersion = (version, compareVersion) => compareVersion.localeCompare(version, undefined, { numeric: true }) === 1;

const database_dir = './db/';
const database_filename = 'database.sqlite';
const database_fullpath = database_dir + database_filename;

async function getDB(){
  return await sqlite.open({
    filename: database_fullpath,
    driver: sqlite3.Database,
  });
}

async function setupDB(){
  const db = await getDB();
  await Promise.all([
    // Keep track of any application data we need
    db.run('CREATE TABLE IF NOT EXISTS application(name TEXT(1024) UNIQUE ON CONFLICT IGNORE NOT NULL, value TEXT(1024) NOT NULL, PRIMARY KEY (name))'),
    // User data
    db.run('CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT(32) UNIQUE ON CONFLICT IGNORE NOT NULL, tag TEXT(64) NOT NULL)'),
    // Tables
    db.run('CREATE TABLE IF NOT EXISTS reports(user INTEGER NOT NULL, amount BIGINT(12) NOT NULL default \'0\', PRIMARY KEY (user), FOREIGN KEY (user) REFERENCES users (id) ON DELETE CASCADE, UNIQUE(user) ON CONFLICT REPLACE)'),
    db.run('CREATE TABLE IF NOT EXISTS verifications(user INTEGER NOT NULL, amount BIGINT(12) NOT NULL default \'0\', PRIMARY KEY (user), FOREIGN KEY (user) REFERENCES users (id) ON DELETE CASCADE, UNIQUE(user) ON CONFLICT REPLACE)'),
    // User Statistics
    db.run('CREATE TABLE IF NOT EXISTS statistic_types(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT(32) UNIQUE ON CONFLICT IGNORE NOT NULL)'),
    db.run('CREATE TABLE IF NOT EXISTS statistics(user INTEGER NOT NULL, type TEXT(1024) NOT NULL, value BIGINT(12) NOT NULL default \'0\', PRIMARY KEY (user, type), FOREIGN KEY (user) REFERENCES users (id) ON DELETE CASCADE, FOREIGN KEY (type) REFERENCES statistic_types (id) ON DELETE CASCADE, UNIQUE(user, type) ON CONFLICT REPLACE)'),
    // Checked on interval
    db.run('CREATE TABLE IF NOT EXISTS schedule_types(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT(32) UNIQUE ON CONFLICT IGNORE NOT NULL)'),
    db.run('CREATE TABLE IF NOT EXISTS schedule(id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT(1024) NOT NULL, user INTEGER NOT NULL, datetime TEXT(24) NOT NULL, value TEXT(2048) NOT NULL default \'\', FOREIGN KEY (user) REFERENCES users (id) ON DELETE CASCADE, FOREIGN KEY (type) REFERENCES schedule_types (id) ON DELETE CASCADE)'),
  ]);

  db.close();
  await updateDB();
  return;
}

async function updateDB(){
  const db = await getDB();
  let version = await db.get('SELECT * FROM application WHERE name=?', 'version');

  // Will only update the version if it doesn't already exist
  if (!version || !version.value) {
    info('Updating database... this might take awhile...');
    // Get our user data
    const reports = await db.all('SELECT * FROM reports');
    const verifications = await db.all('SELECT * FROM verifications');
    // Delete our old tables
    await db.run('DROP TABLE reports');
    await db.run('DROP TABLE verifications');
    await db.run('DROP TABLE entries');
    // Create the new table structure
    await db.run('CREATE TABLE IF NOT EXISTS reports(user INTEGER NOT NULL, amount BIGINT(12) NOT NULL default \'0\', PRIMARY KEY (user), FOREIGN KEY (user) REFERENCES users (id) ON DELETE CASCADE, UNIQUE(user) ON CONFLICT REPLACE)');
    await db.run('CREATE TABLE IF NOT EXISTS verifications(user INTEGER NOT NULL, amount BIGINT(12) NOT NULL default \'0\', PRIMARY KEY (user), FOREIGN KEY (user) REFERENCES users (id) ON DELETE CASCADE, UNIQUE(user) ON CONFLICT REPLACE)');
    // Populate the data
    info('Processing reports:');
    let i = 0;
    for (const res of reports) {
      await addAmount({
        id: res.user,
        tag: 'unknown#1234',
      }, res.points, 'reports');
      consoleProgress(`${++i}/${reports.length}`, i, reports.length);
    }

    info('Processing verifications:');
    i = 0;
    for (const res of verifications) {
      await addAmount({
        id: res.user,
        tag: 'unknown#1234',
      }, res.points, 'verifications');
      consoleProgress(`${++i}/${verifications.length}`, i, verifications.length);
    }
    info('Database updated!');

    // Add a version for our tables
    await db.run('INSERT INTO application (name, value) values (?, ?)', 'version', botVersion);
    version = botVersion;
  } else {
    version = version.value;
  }

  // Example changing tables etc
  // if (isOlderVersion(version, '3.0.1')) {
  //   version = '3.0.1';
  //   await db.run('ALTER TABLE x ADD x ...');
  //   await db.run('INSERT OR REPLACE INTO application (name, value) values (?, ?)', 'version', version);
  // }
  
  await db.run('INSERT OR REPLACE INTO application (name, value) values (?, ?)', 'version', botVersion);

  db.close();
}

async function backupDB(guild){
  // Check if this guild has a backup channel
  const backup_channel = await guild.channels.cache.find(c => c.id == backupChannelID);
  if (!backup_channel) return warn('Backup channel not found!');

  const attachment = await new MessageAttachment().setFile(database_fullpath, 'database.backup.sqlite');

  backup_channel.send({
    content: `__***Database Backup:***__\n_${new Date().toJSON().replace(/T/g,' ').replace(/\.\w+$/,'')}_`,
    files: [attachment],
  }).catch(warn);
}

async function getUserID(user){
  const data = {
    $user: user.id,
    $tag: user.tag,
  };

  const db = await getDB();
  await db.run('INSERT OR REPLACE INTO users (id, user, tag) values ((SELECT id FROM users WHERE user = $user), $user, $tag);', data);
  const { user_id = 0 } = await db.get('SELECT last_insert_rowid() AS user_id;');
  db.close();

  return user_id;
}

async function getAmount(user, table = 'reports'){
  const [
    db,
    user_id,
  ] = await Promise.all([
    getDB(),
    getUserID(user),
  ]);

  let result = await db.get(`SELECT amount FROM ${table} WHERE user=?`, user_id);
  // If user doesn't exist yet, set them up (with 0 reports)
  if (!result) {
    await db.run(`INSERT OR REPLACE INTO ${table} (user, amount) VALUES (?, 0)`, user_id);
    // try get the users points again
    result = await db.get(`SELECT amount FROM ${table} WHERE user=?`, user_id);
  }
  db.close();

  const { amount = 0 } = result || {};

  return +amount;
}

async function addAmount(user, amount = 1, table = 'reports'){
  // Check amount is valid
  amount = +amount;
  if (isNaN(amount)) return;
  amount += await getAmount(user, table);

  const [
    db,
    user_id,
  ] = await Promise.all([
    getDB(),
    getUserID(user),
  ]);

  const data = {
    $user_id: user_id,
    $amount: amount,
  };

  await db.run(`UPDATE ${table} SET amount=$amount WHERE user=$user_id`, data);
  db.close();

  return amount;
}

async function removeAmount(user, amount = 1, table = 'reports'){
  return await addAmount(user, -amount, table);
}

async function setAmount(user, amount = 1, table = 'reports'){
  // Check amount is valid
  amount = +amount;
  if (isNaN(amount)) return;

  const [
    db,
    user_id,
  ] = await Promise.all([
    getDB(),
    getUserID(user),
  ]);

  const data = {
    $user_id: user_id,
    $amount: amount,
  };

  await db.run(`UPDATE ${table} SET amount=$amount WHERE user=$user_id`, data);
  db.close();

  return amount;
}

async function getTop(amount = 10, table = 'reports'){
  if (isNaN(amount)) amount = 10;
  amount = Math.max(1, amount);

  let results = [];

  // TODO: tables
  const db = await getDB();
  switch (table) {
    case 'reports':
    case 'verifications':
      results = await db.all(`SELECT users.user, amount, RANK () OVER ( ORDER BY amount DESC ) rank FROM ${table} INNER JOIN users ON users.id = ${table}.user ORDER BY amount DESC LIMIT ${amount}`);
      break;
    default:
      results = await db.all(`SELECT users.user, value AS amount, RANK () OVER ( ORDER BY value DESC ) rank FROM statistics INNER JOIN statistic_types ON statistics.type = statistic_types.id INNER JOIN users ON users.id = statistics.user WHERE statistic_types.name='${table}' ORDER BY amount DESC LIMIT ${amount}`);
  }
  db.close();

  return results;
}

async function getRank(user, table = 'reports'){
  const [
    db,
    user_id,
  ] = await Promise.all([
    getDB(),
    getUserID(user),
  ]);

  const result = await db.get('SELECT * FROM ( SELECT user, amount, RANK () OVER ( ORDER BY amount DESC ) rank FROM reports ) WHERE user=?', user_id);
  db.close();

  return result.rank || 0;
}

async function getStatisticTypeID(type){
  const data = {
    $type: type,
  };

  const db = await getDB();
  await db.run('INSERT OR REPLACE INTO statistic_types (id, name) values ((SELECT id FROM statistic_types WHERE name = $type), $type);', data);
  const { type_id = 0 } = await db.get('SELECT last_insert_rowid() AS type_id;');
  db.close();

  return type_id;
}

async function getStatisticTypes(){
  const db = await getDB();
  const results = await db.all('SELECT * FROM statistic_types;');
  db.close();

  return results || [];
}

async function getOverallStatistic(stat_type){
  const [
    db,
    type_id,
  ] = await Promise.all([
    getDB(),
    getStatisticTypeID(stat_type),
  ]);

  const result = await db.get('SELECT name, COUNT(user) AS users, SUM(value) AS value FROM statistics INNER JOIN statistic_types ON statistic_types.id = type WHERE type=? GROUP BY type;', type_id);
  db.close();

  const { name = 'not found', users = 0, value = 0 } = result || {};

  return { name, users, value };
}

async function getStatistic(user, type){
  const [
    db,
    user_id,
    type_id,
  ] = await Promise.all([
    getDB(),
    getUserID(user),
    getStatisticTypeID(type),
  ]);

  let result = await db.get('SELECT value FROM statistics WHERE user=? AND type=?', user_id, type_id);
  // If user doesn't exist yet, set them up
  if (!result) {
    await db.run('INSERT OR REPLACE INTO statistics (user, type) VALUES (?, ?)', user_id, type_id);
    // try get the users points again
    result = await db.get('SELECT value FROM statistics WHERE user=? AND type=?', user_id, type_id);
  }
  db.close();

  const { value = 0 } = result || {};

  return +value;
}

async function addStatistic(user, type, amount = 1){
  // Check amount is valid
  amount = +amount;
  if (isNaN(amount)) return;
  amount += await getStatistic(user, type);

  const [
    db,
    user_id,
    type_id,
  ] = await Promise.all([
    getDB(),
    getUserID(user),
    getStatisticTypeID(type),
  ]);

  const data = {
    $type_id: type_id,
    $user_id: user_id,
    $amount: amount,
  };

  await db.run('UPDATE statistics SET value=$amount WHERE user=$user_id AND type=$type_id', data);
  db.close();

  return amount;
}

async function getScheduleTypeID(type){
  const data = {
    $type: type,
  };

  const db = await getDB();
  await db.run('INSERT OR REPLACE INTO schedule_types (id, name) values ((SELECT id FROM schedule_types WHERE name = $type), $type);', data);
  const { type_id = 0 } = await db.get('SELECT last_insert_rowid() AS type_id;');
  db.close();

  return type_id;
}

async function getScheduleItems(date = Date.now()){
  const db = await getDB();

  const results = await db.all(`SELECT schedule.id, schedule_types.name AS type, users.user, schedule.value, schedule.datetime FROM schedule INNER JOIN users ON users.id = schedule.user INNER JOIN schedule_types ON schedule_types.id = type WHERE schedule.datetime <= ${+date} ORDER BY schedule.id ASC`);
  db.close();

  return results;
}

async function addScheduleItem(type, user, time, value = ''){
  const [
    db,
    user_id,
    type_id,
  ] = await Promise.all([
    getDB(),
    getUserID(user),
    getScheduleTypeID(type),
  ]);

  const result = await db.run('INSERT INTO schedule (type, user, datetime, value) VALUES (?, ?, ?, ?)', type_id, user_id, Math.floor(+time), value);
  db.close();

  return result;
}

async function clearScheduleItems(ids = []){
  const db = await getDB();

  const results = await db.run(`DELETE FROM schedule WHERE schedule.id IN (${ids.join(',')})`);
  db.close();

  return results;
}

module.exports = {
  getDB,
  setupDB,
  backupDB,
  getUserID,
  getAmount,
  addAmount,
  setAmount,
  removeAmount,
  getTop,
  getRank,
  getStatisticTypeID,
  getStatisticTypes,
  getOverallStatistic,
  getStatistic,
  addStatistic,
  getScheduleTypeID,
  getScheduleItems,
  addScheduleItem,
  clearScheduleItems,
};
