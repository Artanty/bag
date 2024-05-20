const util = require('util');
const pool = require('./../core/db_connection'); // Assuming this is your database connection pool

// Function to check if there are tasks associated with a service
async function isServiceHasTasks(serviceId) {
  const sql = 'SELECT COUNT(*) AS count FROM TaskExternals WHERE service_id = ?';
  const [results] = await pool.query(sql, [serviceId]);
  console.log(results)
  return results[0].count > 0;
}

async function deleteUserExternal(userId, serviceId) {
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const _isServiceHasTasks = await isServiceHasTasks(serviceId)
      if (_isServiceHasTasks) {
        throw new Error('Can\'t remove service. It has tasks')
      } else {
        console.log('no tasks')
        const deleteUserExternalSql = 'DELETE FROM UserExternals WHERE user_id = ? AND service_id = ?';
        const deleteUserExternalValues = [userId, serviceId]
        
        const [deleteUserExternalResult] = await connection.query(deleteUserExternalSql, deleteUserExternalValues);
        console.log(deleteUserExternalResult)
        
        // Commit the transaction
        await connection.commit();
        
        return {
          removedUserExternalId: serviceId
        }
      }
    } catch (error) {
      // Rollback the transaction in case of any error
      await connection.rollback();
      throw error;
    } finally {
        // Release the connection back to the pool
        connection.release();
    }
  } catch (e) {
    return e
  }
}

module.exports = deleteUserExternal