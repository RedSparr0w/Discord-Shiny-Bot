const sqlite = require('sqlite');

async function getDB(){
  return await sqlite.open('./database.sqlite');
}

async function setupDB(){
  const db = await getDB();
  await Promise.all([
    db.run(`CREATE TABLE IF NOT EXISTS reports(user TEXT(64) PRIMARY KEY UNIQUE NOT NULL, points BIGINT(12) NOT NULL default '0')`),
    db.run(`CREATE TABLE IF NOT EXISTS verifications(user TEXT(64) PRIMARY KEY UNIQUE NOT NULL, points BIGINT(12) NOT NULL default '0')`),
    db.run(`CREATE TABLE IF NOT EXISTS entries(user TEXT(64) PRIMARY KEY UNIQUE NOT NULL, points BIGINT(12) NOT NULL default '0')`),
  ]);
  db.close();
  return;
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

// ALIASES
const getUserReports = async (user) => await getPoints(user, 'reports');
const addUserReport = async (user) => await addPoints(user, 'reports');
const getUserVerifications = async (user) => await getPoints(user, 'verifications');
const addUserVerification = async (user) => await addPoints(user, 'verifications');
const getEntriesPoints = async (user) => await getPoints(user, 'entries');
const addEntriesPoint = async (user) => await addPoints(user, 'entries');

module.exports = {
  setupDB,
  getPoints,
  addPoints,
  getTop,
  getUserReports,
  addUserReport,
  getUserVerifications,
  addUserVerification,
  getEntriesPoints,
  addEntriesPoint,
};
