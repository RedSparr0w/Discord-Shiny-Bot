const sqlite = require('sqlite');

async function getDB(){
  return await sqlite.open('./database.sqlite');
}

async function setupDB(){
  const db = await getDB();
  await db.run(`CREATE TABLE IF NOT EXISTS reports(user TEXT(64) PRIMARY KEY UNIQUE NOT NULL, points BIGINT(12) NOT NULL default '0')`);
  await db.run(`CREATE TABLE IF NOT EXISTS verifications(user TEXT(64) PRIMARY KEY UNIQUE NOT NULL, points BIGINT(12) NOT NULL default '0')`);
  return;
}

async function getUserReports(user, table = 'reports'){
  const db = await getDB();
  const results = await db.get(`SELECT * FROM ${table} WHERE user=?`, user) || { user, points: 0 };
  db.close();
  return results;
}

async function addUserReport(user, table = 'reports'){
  const db = await getDB();
  let { points } = await getUserReports(user, table);

  user = {
    $user:user,
    $points: ++points,
  };
  await db.run(`INSERT OR REPLACE INTO ${table} (user, points) VALUES ($user, $points)`, user);
  db.close();
  return;
}

async function getUserVerifications(user){
  return await getUserReports(user, 'verifications');
}

async function addUserVerification(user){
  return await addUserReport(user, 'verifications');
}

module.exports = {
  setupDB,
  addUserReport,
  getUserReports,
  addUserVerification,
  getUserVerifications,
};
