/**
 * correct external service id: doro@github
 */
function validateExternalServiceId (external_service_id) {
  const [project, service] = external_service_id?.split('@')
  if (!external_service_id) {
    throw new Error(`No external_service_id`)
  }

  if (!(project.length >= 2 && project.length <= 4)) { 
    throw new Error(`Wrong project in: ${external_service_id}, it should be XX, XXX, XXXX format`)
  }
  if (!service) { 
    throw new Error(`Wrong external_service_id in: ${external_service_id}, no service`)
  }

  return true
}

module.exports = validateExternalServiceId