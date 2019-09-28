const sqlite = require('sqlite');
const fs = require('fs');
const { error } = require('./helpers/logging.js');
const { backup_channel_id } = require('./config.json');

const database_dir = './db/';
const database_filename = 'database.sqlite';
const database_fullpath = database_dir + database_filename;

const tables = {
  'reports': 'reporters',
  'verifications': 'verifiers',
  'entries': 'entries',
};

async function getDB(){
  try {
    return await sqlite.open(database_fullpath);
  } catch(O_o){
    // We couldn't access the database
    return undefined;
  }
}

async function setupDB(){
  // If the database directory doesn't exist, create it.
  if (!fs.existsSync(database_dir)){
    fs.mkdirSync(database_dir);
  }

  const db = await getDB();

  // If we couldn't create/access the database, quit the program.
  if (!db){
    error('Could not connect to database! Please ensure the "db" directory exist.');
    process.exit(1);
  }

  // Create our tables
  await Promise.all([
    db.run(`CREATE TABLE IF NOT EXISTS reports(user TEXT(64) PRIMARY KEY UNIQUE NOT NULL, points BIGINT(12) NOT NULL default '0')`),
    db.run(`CREATE TABLE IF NOT EXISTS verifications(user TEXT(64) PRIMARY KEY UNIQUE NOT NULL, points BIGINT(12) NOT NULL default '0')`),
    db.run(`CREATE TABLE IF NOT EXISTS entries(user TEXT(64) PRIMARY KEY UNIQUE NOT NULL, points BIGINT(12) NOT NULL default '0')`),
  ]);
  db.close();
  return;
}

function backupDB(guild){
  const backup_channel = guild.channels.get(backup_channel_id);
  if (!backup_channel) return error('Backup channel not found!');

  backup_channel.send(`__***Backup ${new Date().toJSON().replace(/T/g,' ').replace(/\.\w+$/,'')}***__`, {
    file: {
      attachment: database_fullpath,
      name: `database.backup.sqlite`,
    }
  });
}

async function getPoints(user, table){
  const db = await getDB();

  const results = await db.get(`SELECT points FROM ${table} WHERE user=?`, user) || { points: 0 };
  db.close();

  return +results.points;
}

async function addPoints(user, table, points = 1){
  // Check points is valid
  points = +points;
  if (isNaN(points)) return;

  const db = await getDB();
  points += await getPoints(user, table);

  user = {
    $user: user,
    $points: points,
  };

  await db.run(`INSERT OR REPLACE INTO ${table} (user, points) VALUES ($user, $points)`, user);
  db.close();
  return points;
}

async function getTop(amount = 10, table = 'reports'){
  // amount must be between 1 - 50
  amount = Math.max(1, Math.min(50, amount));
  const db = await getDB();
  const results = await db.all(`SELECT * FROM ${table} ORDER BY points DESC LIMIT ${amount}`);
  db.close();
  return results;
}

async function getAll(table = 'reports'){
  const db = await getDB();
  const results = await db.all(`SELECT * FROM ${table} ORDER BY points DESC`);
  db.close();
  return results;
}

// ALIASES
const getUserReports = async (user) => await getPoints(user, 'reports');
const addUserReport = async (user) => await addPoints(user, 'reports');
const getUserVerifications = async (user) => await getPoints(user, 'verifications');
const addUserVerification = async (user) => await addPoints(user, 'verifications');
const getEntriesPoints = async (user) => await getPoints(user, 'entries');
const addEntriesPoint = async (user) => await addPoints(user, 'entries');

module.exports = {
  tables,
  setupDB,
  backupDB,
  getPoints,
  addPoints,
  getTop,
  getAll,
  getUserReports,
  addUserReport,
  getUserVerifications,
  addUserVerification,
  getEntriesPoints,
  addEntriesPoint,
};
