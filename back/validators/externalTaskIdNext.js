function isNumericString(str) {
  return /^\d+$/.test(str);
}

function validateExternalTaskIdNext (external_task_id) {
  const [serviceNameId, next] = external_task_id?.split('-')

  if (!external_task_id) {
    throw new Error(`No external_task_id`)
  }

  if (!(serviceNameId.length >= 2 && serviceNameId.length <= 4)) { 
    throw new Error(`Wrong external_task_id: ${external_task_id}, ext service id must be XX, XXX, XXXX format`)
  }

  if (!next) { 
    throw new Error(`Wrong external_task_id: ${external_task_id}, no next`)
  }

  if (next !== 'next'){
    throw new Error(`Wrong external_task_id: ${external_task_id}, next is not next`)
  }
  
  return true
}

module.exports = validateExternalTaskIdNext