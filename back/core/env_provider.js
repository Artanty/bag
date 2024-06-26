
const axios = require('axios');
const retry = require('async-retry');
require('dotenv').config();

async function fetchEnvData() {
  return retry(async (bail, attempt) => {
    try {
      const response = await axios.post('https://cs99850.tmweb.ru/safe/get', {
        projectId: "bag@back",
        state: "RUNTIME"
      });
      console.log('Environment data fetched successfully');
      return response.data.data;
    } catch (error) {
      if (error.code === 'EAI_AGAIN') {
        console.log(`Attempt ${attempt} failed: DNS resolution error. Retrying...`);
        throw error; // This will trigger a retry
      } else {
        bail(error); // This will stop retrying and throw the error
      }
    }
  }, {
    retries: 3, // Number of retry attempts
    minTimeout: 1000, // Minimum delay between retries in milliseconds
  });
}

async function loadEnvFromUrl() {
  try {
    return fetchEnvData()
    .then(envData => {
      for (const key in envData) {
        process.env[key] = envData[key];
      }
    })
    .catch(error => {
      if (error.name === 'AggregateError') {
        console.error('Failed to fetch environment data after retries. Individual errors:');
        error.errors.forEach((err, index) => {
          console.error(`Error ${index + 1}:`, err.code);
        });
      } else {
        console.error('Failed to fetch environment data:', error);
      }
    });
  } catch (error) {
    console.error('Error fetching environment data from URL:', error);
    process.exit(1); // Exit the process if unable to fetch environment data
  }
}

// Function to load environment variables from local environment variables
function loadEnvFromLocal() {
  return true
  // This function doesn't need to do anything special since process.env is already available
}

// Function to decide which source to use and load environment variables
async function loadEnvironmentVariables() {

  if (process.env.LOCAL_ENVS === 'true') {
    console.log('local variables used')
    return loadEnvFromLocal();
  } else {
    console.log('Loading environment variables from safe@...')
    return await loadEnvFromUrl();
  }
}

module.exports = loadEnvironmentVariables