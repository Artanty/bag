require('dotenv').config();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
// const mysql = require('mysql');
const mysql = require('mysql2/promise');
const BaseCRUD = require('./base-crud')
const express = require('express');
const app = express();
app.use(cors());
app.use(bodyParser.json());
const fs = require('fs').promises; // Use promises for fs to handle asynchronous operations
const pool = require('./../core/db_connection')
const getAuthenticatedUser = require ('./../external/getAuthenticatedUser')
const validateCreateTaskData = require('./../validators/createTask')
const getNextExternalTaskId = require('../functions/getNextExternalTaskId')
const getFirstExternalTaskId = require('../functions/getFirstExternalTaskId')
// const findOrCreateExtAPI = require('../functions/external.api')
const validateFindOrCreateExtData = require('./../validators/findOrCreateExt')
const parseCommitMessage = require('./../functions/parseCommitMessage')
const validateExternalTaskId = require('./../validators/externalTaskId')
const validateExternalTaskId$ = require('./../validators/externalTaskId$')
const validateExternalTaskIdNext = require('./../validators/externalTaskIdNext')
const getDefaultDueDate = require('./../functions/getDefaultDueDate')
const createAndLinkExternalService = require('./../dbActions/createAndLinkExternalService')
const deleteUserExternal = require('./../dbActions/deleteUserExternal')

// app.get('/', function (req, res) {
// 	res.send('Main page')
// });

// app.get('/about', function (req, res) {
// 	res.sendFile(path.join(__dirname, '..', 'components', 'about.htm'));
// });

app.get('/users2', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Users');
    res.json(rows);
  } catch (error) {
    console.error('Error executing query', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.get('/get-updates', async (req, res) => {
  try {
    // res.send(`ready`);
    const [rows] = await pool.query('SELECT * FROM NOY__requests');
    res.json(rows);
  } catch (error) {
    res.status(500).send(error.message);
  }
});



// Users CRUD operations extending the base class
class UsersCRUD extends BaseCRUD {
  constructor(tableName, app) {
    super(tableName, app); // Pass the table name to the base class
  }
}

const usersCRUD = new UsersCRUD('Users');

app.post('/users', (req, res) => usersCRUD.createAPI(req, res));
app.get('/users/', (req, res) => usersCRUD.readAllAPI(req, res));
app.get('/users/:id', (req, res) => usersCRUD.readAPI(req, res));
app.put('/users/:id', (req, res) => usersCRUD.updateAPI(req, res));
app.delete('/users/:id', (req, res) => usersCRUD.deleteAPI(req, res));


// const externalsCRUD = new UsersCRUD('Externals');

// app.post('/externals', (req, res) => externalsCRUD.createAPI(req, res));
// app.get('/externals/', (req, res) => externalsCRUD.readAllAPI(req, res));
// app.get('/externals/:id', (req, res) => externalsCRUD.readAPI(req, res));
// app.put('/externals/:id', (req, res) => externalsCRUD.updateAPI(req, res));
// app.delete('/externals/:id', (req, res) => externalsCRUD.deleteAPI(req, res));

class TasksCRUD extends BaseCRUD {
  constructor(tableName, app) {
    super(tableName, app); // Pass the table name to the base class
  }

  async getLastTaskOfServiceAndUser(userId, externalServiceId) {
    const sql = `
    SELECT te.*
    FROM TaskExternals te
    JOIN UserExternals ue ON te.service_id = ue.service_id
    WHERE ue.user_id = ? AND ue.service_id = ?
    ORDER BY te.created_at DESC
    LIMIT 1
  `;
    const [rows] = await pool.query(sql, [userId, externalServiceId]);
    return rows[0]; // Return the first element of the rows array
  }

  // async getLastTaskIdAPI(externalServiceId) {
  //   return this.getLastTaskOfServiceAndUser(getAuthenticatedUser(), externalServiceId)
  // }

  async createTaskAndExternalTask (taskData, nextExternalTaskId) {
    let connection;
    try { 
      // Start a transaction
      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Insert the task into the Tasks table
      const taskInsertQuery = 'INSERT INTO Tasks (user_id, title, description, status, due_date) VALUES (?, ?, ?, ?, ?)';
      const taskInsertValues = [getAuthenticatedUser(), taskData.title, taskData.description, taskData.status, taskData.due_date];
      const [taskResult] = await connection.query(taskInsertQuery, taskInsertValues);

      // Retrieve the ID of the newly created task
      const taskId = taskResult.insertId;

      // Insert the TaskExternal record into the TaskExternals table
      const taskExternalInsertQuery = 'INSERT INTO TaskExternals (task_id, service_id, external_task_id) VALUES (?, ?, ?)';
      const taskExternalInsertValues = [taskId, taskData.externalServiceId, nextExternalTaskId];
      await connection.query(taskExternalInsertQuery, taskExternalInsertValues);

      // Commit the transaction
      await connection.commit();

      return { message: 'Task and TaskExternal created successfully', taskId }
    } catch (error) {
      // Rollback the transaction in case of any error
      if (connection) {
        await connection.rollback();
      }
      throw new Error('Error creating task and TaskExternal: ' + error);
      
    } finally {
      console.log('finally')
      // Release the connection back to the pool
      if (connection) {
        connection.release();
      }
    }
  }

  async getNextIdAndCreate(req, res) {
    new Promise((resolve, reject) => {
      const validationResult = validateCreateTaskData(req.body)
      if (validationResult.isValid) {
        console.log('Data is valid.');
        resolve(res)
      } else {
        reject('Data validation error:' + validationResult.error);
      }
    })
    .then(() => this.getLastTaskOfServiceAndUser(getAuthenticatedUser(), req.body.externalServiceId))
    .then((lastTask) => {
      const nextExternalTaskId = lastTask
        ? getNextExternalTaskId(lastTask.external_task_id)
        : getFirstExternalTaskId(req.body.externalServiceName)
      return this.createTaskAndExternalTask(req.body, nextExternalTaskId)
    })
    .then(resp => res.status(201).json(resp))
    .catch(error => {
      this.handleError(res, error)
    });  
  }

  async readByService (serviceId) {
    const query = `
      SELECT t.*, te.external_task_id, te.service_id, e.name as service_name
      FROM Tasks t
      JOIN TaskExternals te ON t.id = te.task_id
      JOIN Externals e ON te.service_id = e.id
      WHERE te.service_id = ?
    `;
    const [rows] = await pool.query(query, [serviceId]);

    return rows
  }
  
  readByServiceAPI (req, res) {
    this.readByService(req.params.serviceId)
      .then(records => res.json(records))
      .catch(error => this.handleError(res, error));
  }

  /**
   * Запрос осуществляется при создании коммита (commit-msg hook)
   * Если приходит определенный id задачи (PLAN-0001):
   * { "message": "* build: PLAN-0001 commit message;", "externalServiceName": "plan@github" }
   * то пытаемся его найти, 
   * если нашли возвращаем коммит со ссылкой на задачу:
   * @returns 200 string 
   * * build: DORO-0009 pre-commit hook https://service.com/plan/get-ext-task/DORO-0009
   * 
   * если не нашли - возвращаем ошибку:
   * @returns 500 
   * { "message": "Record not found", error: true }
   * 
   * Если не приходит определенный id задачи (PLAN-next):
   * * { "message": "* build: PLAN-next commit message;", "externalServiceName": "plan@github" }
   * то создаем задачу со следующим парядковым id (PLAN-0002) 
   * и возвращаем коммит со ссылкой на задачу:
   * @returns 201 string 
   * * build: XXXX-0009 pre-commit hook https://service.com/plan/get-ext-task/DORO-0009
   * 
   */
  async findOrCreateExtAPI(req, res) {
    try{
      validateFindOrCreateExtData(req.body)
      
      const commitMessage = req.body.message
      const msg = parseCommitMessage(commitMessage); // type, taskId, text
    
      if (msg.taskId.split('-')[1] === 'next') {
        msg.taskId && validateExternalTaskIdNext(msg.taskId)
        this.getExternalServiceIdByName(req.body.externalServiceName)
        .then( async (externalServiceId) => {
          return [
            await this.getLastTaskOfServiceAndUser(getAuthenticatedUser(), externalServiceId), 
            externalServiceId
          ]
        })
        .then(async ([lastTask, externalServiceId]) => {
          const nextExternalTaskId = lastTask
            ? getNextExternalTaskId(lastTask.external_task_id)
            : getFirstExternalTaskId(req.body.externalServiceName)
          const taskData = {
            externalServiceName: req.body.externalServiceName,
            externalServiceId: externalServiceId,
            title: msg.text,
            status: 'To Do',
            due_date: getDefaultDueDate()
          }
          const validation = validateCreateTaskData(taskData)
          if (validation.isValid) {
            await this.createTaskAndExternalTask(taskData, nextExternalTaskId)
            .then(() => {
              const commitMessage = `* ${msg.type}: ${nextExternalTaskId} ${msg.text} ${process.env.RED_URL}/${process.env.RED_SERVICE}/get-ext-task/${nextExternalTaskId}`
              res.set('Content-Type', 'text/plain');
              res.send(commitMessage);
            }).catch(e => this.handleError(res, e))
          } else {
            this.handleError(res, validation.error)
          }
        })
        .catch(error => this.handleError(res, error));
      } else {
        validateExternalTaskId$(msg.taskId)
        .then(() => {
          return this.getTaskByExternalId(msg.taskId);
        })
        .then((task) => {
          const commitMessage = `* ${msg.type}: ${msg.taskId} ${task.title}: ${msg.text} ${process.env.RED_URL}/${process.env.RED_SERVICE}/get-ext-task/${msg.taskId}`
          res.set('Content-Type', 'text/plain');
          res.send(commitMessage);
        })
        .catch((error) => {
          this.handleError(res, error);
        });
      }
    } catch (e) {
      this.handleError(res, e)
    }
  }

  async getTaskByExternalId (extTaskId) {
    const sql = `
      SELECT t.*
      FROM Tasks t
      JOIN TaskExternals te ON t.id = te.task_id
      WHERE te.external_task_id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [extTaskId]);
    if (!rows.length) {
      throw new Error('Record not found')
    }
    return rows[0];
  }

  async getExternalServiceIdByName (externalServiceName) {
    const sql = `
      SELECT e.id
      FROM Externals e
      WHERE e.name = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [externalServiceName]);
    if (!rows.length) {
      throw new Error('Record not found')
    }
    return rows[0]?.id;
  }


  async deleteWithExternal(taskId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Delete the associated TaskExternals entries from the TaskExternals table
      const [taskExternalsDeletionResult] = await connection.query('DELETE FROM TaskExternals WHERE task_id = ?', [taskId]);

      // Delete the task from the Tasks table
      const [taskDeletionResult] = await connection.query('DELETE FROM Tasks WHERE id = ?', [taskId]);

      // Check if the task was deleted successfully
      if (taskDeletionResult.affectedRows === 0) {
        throw new Error(`No task found with id ${taskId}`);
      }

      // Commit the transaction
      await connection.commit();

      console.log('Task and associated TaskExternals entries deleted successfully.');
      return { message: `task ${taskId} with taskExternals deleted` }
    } catch (error) {
      // Rollback the transaction in case of any error
      await connection.rollback();
      console.error('Error deleting task and associated TaskExternals entries:', error);
      throw error; // Rethrow the error to be handled by the caller
    } finally {
      // Release the connection back to the pool
      connection.release();
    }

  }

  deleteWithExternalAPI (req, res) {
    this.deleteWithExternal(req.params.id)
      .then(records => res.json(records))
      .catch(error => this.handleError(res, error));
  }


  // async (id) {
  //   const sql = `DELETE FROM Tasks WHERE id = ?`;
  //   const [result] = await pool.query(sql, [id]);
  //   if (result.affectedRows === 0) {
  //     throw new Error('Record not found')
  //   }
  //   return result;
  // }
  async getFullTaskByExternalId (extTaskId) {
    const sql = `
      SELECT t.*, te.external_task_id, te.service_id, e.name
      FROM Tasks t
      JOIN TaskExternals te ON t.id = te.task_id
      JOIN Externals e ON te.service_id = e.id
      WHERE te.external_task_id = ?
      LIMIT 1
    `;
    // FROM Tasks t
    // JOIN TaskExternals te ON t.id = te.task_id
    // JOIN Externals e ON te.service_id = e.id
    const [rows] = await pool.query(sql, [extTaskId]);
    if (!rows.length) {
      throw new Error('Record not found')
    }
    return rows[0];
  }
  getFullTaskByExternalIdAPI(req, res) {
    this.getFullTaskByExternalId(req.params.id)
      .then(records => res.json(records))
      .catch(error => this.handleError(res, error));
  }
}

const tasksCRUD = new TasksCRUD('Tasks');

app.post('/tasks', (req, res) => tasksCRUD.getNextIdAndCreate(req, res));
app.get('/tasks/', (req, res) => tasksCRUD.readAllAPI(req, res));
app.get('/tasks/by-service/:serviceId', (req, res) => tasksCRUD.readByServiceAPI(req, res));
app.get('/tasks/:id', (req, res) => tasksCRUD.readAPI(req, res));
app.get('/tasks/full/:id', (req, res) => tasksCRUD.getFullTaskByExternalIdAPI(req, res));
app.put('/tasks/:id', (req, res) => tasksCRUD.updateAPI(req, res));
app.delete('/tasks/:id', (req, res) => tasksCRUD.deleteWithExternalAPI(req, res));
// app.get('/getLast', (req, res) => usersCRUD.userExternalsAPI({ params: { id: getAuthenticatedUser() } }, res));
app.post('/tasks/find-or-create', (req, res) => tasksCRUD.findOrCreateExtAPI(req, res));
app.get('/tasks/find-or-create', (req, res) => tasksCRUD.findOrCreateExtAPI(req, res));

// not used
class ExternalsCRUD extends BaseCRUD {
  constructor(tableName, app) {
    super(tableName, app);
  }
}
const externalsCRUD = new ExternalsCRUD('Externals');


class UserExternalsCRUD extends BaseCRUD {
  constructor(tableName, app) {
    super(tableName, app); // Pass the table name to the base class
  }
  async userExternals(userId) {
    const sql = `
        SELECT e.*, ue.access_token, ue.refresh_token
        FROM UserExternals ue
        JOIN Externals e ON ue.service_id = e.id
        WHERE ue.user_id = ?
    `;
    const [records] = await pool.query(sql, [userId]);
    
    if (!records.length) {
      throw new Error('No external services found for the user');
    }

    return records;
  }

  getUserExternalsAPI(req, res) {
    this.userExternals(req.params.id)
      .then(record => res.json(record))
      .catch(error => this.handleError(res, error));
  }

  async createAndLinkExternalServiceAPI (req, res) {
    createAndLinkExternalService(req, getAuthenticatedUser())
    .then(result => res.status(201).json(result))
    .catch(error => this.handleError(res, error));
  }

  // deleteUserExternalsAPI(req, res) {
  //   deleteUserExternals(req, getAuthenticatedUser())
  //   .then(result => res.status(201).json(result))
  //   .catch(error => this.handleError(res, error));
  // }

  async deleteUserExternalsAPI(req, res) {
    console.log('id')
    console.log(req.params.id)

    deleteUserExternal(getAuthenticatedUser(), req.params.id)
        .then(result => res.status(201).json(result))
        .catch(error => this.handleError('Error:', String(error)));
    // .then(result => res.status(201).json(result))
    // .catch(error => this.handleError(res, error));
    // res.status(201)
  }

  // Example usage:
// const serviceIdToDelete = 1; // Replace with the actual service ID
// deleteServiceAndAssociations(serviceIdToDelete, (error, message) => {
//   if (error) {
//     console.error('Error:', error);
//   } else {
//     console.log(message);
//   }
// });
}

const userExternalsCRUD = new UserExternalsCRUD('userExternals');

app.get('/userExternals', (req, res) => userExternalsCRUD.getUserExternalsAPI({ params: { id: getAuthenticatedUser() } }, res));
app.post('/userExternals/createAndLink', (req, res) => userExternalsCRUD.createAndLinkExternalServiceAPI(req, res));
app.delete('/userExternals/:id', (req, res) => userExternalsCRUD.deleteUserExternalsAPI(req, res));

// localhost:3000/get-ext-task/PLAN-0012
app.use('/plan/', express.static(path.join(__dirname, './../public/web-host')));

// /get-ext-task/PLAN-0012
app.get('/get-ext-task/:externalId', async (req, res) => {
  try {
    const taskRes = await tasksCRUD.getFullTaskByExternalId(req.params.externalId)
    const jsonData = JSON.stringify(taskRes);
    await fs.writeFile(path.join(__dirname, './../public/web-host/assets/data.json'), jsonData);
    res.redirect(`/plan/?ext=${req.params.externalId}`);
  } catch (err) {
    console.error('Error writing to file', err);
    res.status(500).send('Error writing to file');
  }
});
// Start the server
const PORT = process.env.PORT || 3205;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
