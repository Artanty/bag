const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

async function createDatabasePool() {
  let dbConfig;

  if (process.env.LOCAL_ENVS === 'true') {
    dbConfig = {
      database: process.env.DB_DATABASE,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
  } else {
    try {
      const response = await axios.post('https://cs99850.tmweb.ru/safe/get', {
        projectId: "bag@back",
        state: "RUNTIME"
      });

      const envData = response.data;
      dbConfig = {
        database: envData.DB_DATABASE,
        user: envData.DB_USERNAME,
        password: envData.DB_PASSWORD,
        host: envData.DB_HOST,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      };
    } catch (error) {
      console.error('Error fetching environment data:', error);
      process.exit(1); // Exit the process if unable to fetch environment data
    }
  }

  return mysql.createPool(dbConfig);
}

module.exports = createDatabasePool();