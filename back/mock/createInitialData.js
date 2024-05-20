const pool = require('./../core/db_connection')

async function insertMockData() {
  try {
    // Insert a user
    const userResult = await pool.execute(
      'INSERT INTO Users (username, password, email) VALUES (?, ?, ?)',
      ['Artyom', 'hashed_password', 'artyom@example.com']
    );
    const userId = userResult[0].insertId; // Assuming auto-incrementing user ID

    // Insert a service
    const serviceResult = await pool.execute(
      'INSERT INTO Externals (name, url) VALUES (?, ?)',
      ['doro@github', 'https://github.com/Artanty/doro']
    );
    const serviceId = serviceResult[0].insertId; // Assuming auto-incrementing service ID

    // Insert a task for the user
    const taskResult = await pool.execute(
      'INSERT INTO Tasks (user_id, title, status) VALUES (?, ?, ?)',
      [userId, '* back: sse fix x-accel-buffering: no;', 'Completed']
    );
    const taskId = taskResult[0].insertId; // Assuming auto-incrementing task ID

    // Insert an entry into the TaskServices table
    await pool.execute(
      'INSERT INTO TaskExternals (task_id, service_id, external_task_id) VALUES (?, ?, ?)',
      [taskId, serviceId, 'DORO-0001']
    );

    // Insert a UserService entry
    await pool.execute(
      'INSERT INTO UserExternals (user_id, service_id, access_token, refresh_token) VALUES (?, ?, ?, ?)',
      [userId, serviceId, 'access_token_value', 'refresh_token_value']
    );

    console.log('Mock data inserted successfully');
  } catch (error) {
    console.error('Error inserting mock data:', error);
  }
}

insertMockData();