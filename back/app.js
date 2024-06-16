const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./core/db_connection')
app.use(cors());
app.use(bodyParser.json());
const fs = require('fs').promises; // Use promises for fs to handle asynchronous operations
const os = require('os');
const axios = require('axios');
// Middleware to check if the request method is POST
// app.use((req, res, next) => {
//   if (req.method === 'POST') {
//     next();
//   } else {
//     res.status(405).send('Only POST requests are allowed');
//   }
// });
const DB_NAME = 'cs99850_bag'
// app.get('/get-updates', async (req, res) => {
//   try {
//     // res.send(`ready`);
//     const [rows] = await pool.query('SELECT * FROM NOY__requests');
//     res.json(rows);
//   } catch (error) {
//     res.status(500).send(error.message);
//   }
// });

app.post('/table-update', async (req, res) => {
  const { app_name, query, DB_SYNC_MODE_FORCE } = req.body;
  const tableName = query.match(/ALTER TABLE\s+(\w+)/i)[1];
  const fullTableName = `${app_name}__${tableName}`;

  try {
    const connection = await pool.getConnection();
    if (DB_SYNC_MODE_FORCE) {
      await connection.query(`DELETE FROM ${fullTableName}`);
    }
    await connection.query(query.replace(tableName, fullTableName));
    connection.release();
    res.send(`Table ${fullTableName} updated successfully`);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post('/table-query', async (req, res) => {
  console.log('table-query req url: ' + req.originalUrl)
  let { app_name, query } = req.body;

  if (query.trim().toUpperCase().startsWith('SELECT TABLE_NAME')) {
    // Replace the table_schema placeholder with the actual database name from the environment variable
    const dbName = process.env.DB_DATABASE;
    query = query.replace('table_schema = ?', `table_schema = "${dbName}"`);
    // Check for table_name IN (...) pattern and rename table names inside
    const inPattern = /table_name\s+IN\s+\(([^)]+)\)/i;
    const inMatch = query.match(inPattern);
    if (inMatch) {
      const tableNamesIn = inMatch[1].split(',').map(name => name.trim().replace(/['"]/g, ''));
      const renamedTableNames = tableNamesIn.map(name => `'${app_name}__${name}'`).join(', ');
      query = query.replace(inPattern, `table_name IN (${renamedTableNames})`);
    }
  } else if (query.trim().toUpperCase().startsWith('CREATE TABLE')) {
    const tableName = query.match(/TABLE\s+(\w+)/i)[1];
    const fullTableName = `${app_name}__${tableName}`;
    query = query.replace(tableName, fullTableName)
  } else {
    // Match table names in various SQL statements
    const tableNameMatch = query.match(/(?:INSERT INTO|UPDATE|DELETE FROM|FROM)\s+(\w+)/i);
    if (!tableNameMatch) {
      return res.status(400).send('Invalid SQL query: Could not find a table name');
    }
    const tableName = tableNameMatch[1];
    const fullTableName = `${app_name}__${tableName}`;
    query = query.replace(tableName, fullTableName)
  }
  console.log(query)
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(query);
    connection.release();
    res.json(rows)
  } catch (error) {
    console.log(error)
    if (error.code === 'ER_NO_SUCH_TABLE') {
      res.status(404).send(`Table ${fullTableName} doesn't exist, create table first by calling POST /table-create with app_name and query parameters`);
    } else if (error.code === 'ECONNREFUSED') {
      const publicIP = await getPublicIP()
      res.status(404).send(`Can't connect to database. Add IP of this backend: ${publicIP} to permitted.`);
    } else {
      res.status(500).send(error.message);
    }
  }
});

app.get('/get-updates', async (req, res) => {
  res.json({ BAG__STATUS: 'working' })
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

async function getPublicIP() {
  try {
    const response = await axios.get('https://api.ipify.org?format=json');
    return response.data.ip;
  } catch (error) {
    console.error('Error fetching public IP:', error);
    return null;
  }
}