const express = require('express');
const app = express();
app.use(express.json());
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./core/db_connection')
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
const DB_NAME = 'cs99850_bag'
app.get('/get-updates', async (req, res) => {
  try {
    // res.send(`ready`);
    const [rows] = await pool.query('SELECT * FROM NOY__requests');
    res.json(rows);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post('/table-create', async (req, res) => {
  const { app_name, query } = req.body;
  const tableName = query.match(/TABLE\s+(\w+)/i)[1];
  const fullTableName = `${app_name}__${tableName}`;

  try {
    const connection = await pool.getConnection();
    await connection.query(query.replace(tableName, fullTableName));
    connection.release();
    res.send(`Table ${fullTableName} created successfully`);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

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

app.post('/status', async (req, res) => {
  try {
        // Get check type and tables from request body
    const { check, tables } = req.body;

    // Validate check and tables
    if (!check || !Array.isArray(check)) {
      return res.status(400).json({ error: 'Missing or invalid "check" in the request body' });
    }

    // Tables are required only if 'tableExist' is specified in check
    if (check.includes('tableExist') && (!tables || !Array.isArray(tables))) {
      return res.status(400).json({ error: 'Missing or invalid "tables" in the request body' });
    }

    // Get a connection from the pool
    const connection = await pool.getConnection();

    try {
      // Check database connection if 'dbConnection' is specified
      let dbConnectionStatus;
      if (check.includes('dbConnection')) {
        const [rows] = await connection.query('SELECT 1 + 1 AS solution');
        dbConnectionStatus = rows[0].solution === 2 ? true : 'Database connection failed';
        if (!dbConnectionStatus) {
          return res.status(400).json({ error: 'Database connection failed' });
        }
      }

      // Check table existence if 'tableExist' is specified
      let tableExistsStatus = {};
      if (check.includes('tableExist')) {
        for (const tableName of tables) {
          const [tableCheck] = await connection.query(`SELECT COUNT(*) as count FROM information_schema.tables 
          WHERE table_schema = ? AND table_name = ?`, [DB_NAME, tableName]);
          const tableExists = tableCheck[0].count > 0;
          tableExistsStatus[tableName] = tableExists;
        }

        const allTablesExist = Object.values(tableExistsStatus).every(Boolean);
        if (!allTablesExist) {
          return res.status(400).json({ error: `Tables ${Object.entries(tableExistsStatus)
            .filter(([_, value]) => value !== true)
            .map(([key, _]) => key)
            .join(', ')} do not exist` });
        }
      }
      
      const response = {};
      if (check.includes('dbConnection')) {
        response.dbConnectionStatus = dbConnectionStatus;
      }
      if (check.includes('tableExist')) {
        response.tableExists = tableExistsStatus;
      }

      res.json(response);

    } finally {
      // Release the connection back to the pool
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while checking the status' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});