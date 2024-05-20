const pool = require('./../core/db_connection')
const validateExternalServiceId = require('./../validators/externalServiceId')

async function createAndLinkExternalService (req, userId) {
  const { name, url, data, apiKey, apiSecret, accessToken, refreshToken } = req.body;

  // Validate the request data
  if (!userId || !name) {
    throw new Error('Missing required fields');
  }

  validateExternalServiceId(name)

  try {
      // Start a transaction
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      try {
          // Prepare the SQL query to insert into Externals
          const createServiceSql = `INSERT INTO Externals (name, url, data, api_key, api_secret) VALUES (?, ?, ?, ?, ?)`;
          const createServiceValues = [name, url || null, data || null, apiKey || null, apiSecret || null];

          // Execute the query to create the external service
          const [serviceResult] = await connection.query(createServiceSql, createServiceValues);
          const serviceId = serviceResult.insertId;

          // Prepare the SQL query to insert into UserExternals
          const linkServiceSql = `INSERT INTO UserExternals (user_id, service_id, access_token, refresh_token) VALUES (?, ?, ?, ?)`;
          const linkServiceValues = [userId, serviceId, accessToken, refreshToken];

          // Execute the query to link the service to the user
          const [linkResult] = await connection.query(linkServiceSql, linkServiceValues);

          // Commit the transaction
          await connection.commit();

          // Return the created UserExternal
          return {
              id: linkResult.insertId,
              user_id: userId,
              service_id: serviceId,
              access_token: accessToken,
              refresh_token: refreshToken
          }
      } catch (error) {
          // Rollback the transaction in case of any error
          await connection.rollback();
          throw error;
      } finally {
          // Release the connection back to the pool
          connection.release();
      }
  } catch (error) {
    throw error;
  }
};

module.exports = createAndLinkExternalService;