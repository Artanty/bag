function isNumericString(str) {
  return /^\d+$/.test(str);
}

function validateExternalTaskId (external_task_id) {
  const [serviceNameId, num] = external_task_id?.split('-')

  if (!external_task_id) {
    throw new Error(`No external_task_id`)
  }

  if (!(serviceNameId.length >= 2 && serviceNameId.length <= 4)) { 
    throw new Error(`Wrong external_task_id: ${external_task_id}, ext service id must be XX, XXX, XXXX format`)
  }

  if (!num) { 
    throw new Error(`Wrong external_task_id: ${external_task_id}, no ext number`)
  }

  if (!isNumericString(num)){
    throw new Error(`Wrong external_task_id: ${external_task_id}, ext number must be numeric`)
  }

  if (num.length !== 4){
    throw new Error(`Wrong external_task_id: ${external_task_id}, ext number must be XXXX format`)
  }
  
  return true
}

module.exports = validateExternalTaskId