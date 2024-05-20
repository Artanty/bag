const validateExternalServiceId = require('./../validators/externalServiceId')
const fillWithLeadingZeros = require('./fillWithLeadingZeros')

function getFirstExternalTaskId (externalServiceName) {
  try {
    validateExternalServiceId(externalServiceName)
    let [project, service] = externalServiceName?.split('@')

    return project.toUpperCase() + '-' + fillWithLeadingZeros(1)
  } catch(error) {
    throw new Error(error)
  }
}

module.exports = getFirstExternalTaskId