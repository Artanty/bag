
const axios = require('axios');
const retry = require('async-retry');

async function fetchEnvData() {
  return retry(async (bail, attempt) => {
    try {
      const response = await axios.post('https://cs99850.tmweb.ru/safe/get', {
        projectId: "bag@back",
        state: "RUNTIME"
      });
      return response.data;
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

// Function to load environment variables from a URL
async function loadEnvFromUrl() {
  try {
    return fetchEnvData()
    .then(envData => {
      console.log('Environment data fetched successfully:', envData);
      // const envData = response.data;
      for (const key in envData) {
        process.env[key] = envData[key];
      }
    })
    .catch(error => {
      console.error('Failed to fetch environment data after retries:', error);
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
    console.log('safe@ variables used')
    return await loadEnvFromUrl();
  }
}

module.exports = loadEnvironmentVariables