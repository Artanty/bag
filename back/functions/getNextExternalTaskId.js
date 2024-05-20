const validateExternalTaskId = require('./../validators/externalTaskId')
const fillWithLeadingZeros = require('./fillWithLeadingZeros')

function getNextExternalTaskId (external_task_id) {
  try {
    validateExternalTaskId(external_task_id)
    let [serviceNameId, num] = external_task_id?.split('-')
    num = Number(num) + 1
    
    return serviceNameId + '-' + fillWithLeadingZeros(num)
  } catch(error) {
    throw new Error(error)
  }
}

module.exports = getNextExternalTaskId