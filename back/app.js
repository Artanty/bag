const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('core/db_connection')
app.use(cors());
app.use(bodyParser.json());
const fs = require('fs').promises; // Use promises for fs to handle asynchronous operations

// Middleware to check if the request method is POST
// app.use((req, res, next) => {
//   if (req.method === 'POST') {
//     next();
//   } else {
//     res.status(405).send('Only POST requests are allowed');
//   }
// });

app.get('/get-updates', async (req, res) => {
  try {
    // res.send(`ready`);
    const [rows] = await pool.query('SELECT * FROM NOY__requests');
    res.json(rows);
  } catch (error) {
    res.status(500).send(error.message);
  }
});
app.get('/get-db', async (req, res) => {
  try {
    // res.send(`ready`);
    // const [rows] = await pool.query('SELECT * FROM NOY__requests');
    res.json(process.env.DB_DATABASE);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Endpoint for table creation
app.post('/table-create', async (req, res) => {
  const { app_name, query } = req.body;
  const tableName = query.match(/TABLE\s+(\w+)/i)[1];
  const fullTableName = `${app_name}__${tableName}`;

  try {
    // const connection = await pool.getConnection();
    // await connection.query(query.replace(tableName, fullTableName));
    // connection.release();
    // res.send(`Table ${fullTableName} created successfully`);
    const [rows] = await pool.query('SELECT * FROM NOY__requests');
    res.json(rows);
    // res.send(`ready`);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// Endpoint for table update
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

// Endpoint for table query
app.post('/table-query', async (req, res) => {
  const { app_name, query } = req.body;
  // Match table names in various SQL statements
  const tableNameMatch = query.match(/(?:INSERT INTO|UPDATE|DELETE FROM|FROM)\s+(\w+)/i);
  if (!tableNameMatch) {
    return res.status(400).send('Invalid SQL query: Could not find a table name');
  }
  const tableName = tableNameMatch[1];
  const fullTableName = `${app_name}__${tableName}`;

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(query.replace(tableName, fullTableName));
    connection.release();
    res.json(rows);
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      res.status(404).send(`Table ${fullTableName} doesn't exist, create table first by calling POST /table-create with app_name and query parameters`);
    } else {
      res.status(500).send(error.message);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});