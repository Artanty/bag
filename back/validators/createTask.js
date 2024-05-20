function validateCreateTaskData(taskData) {
  // Validate externalServiceName
  if (!taskData.externalServiceName) {
    return {
      isValid: false,
      error: 'No external service name.'
    };
  }
  // Validate externalServiceId
  if (!taskData.externalServiceId) {
    return {
      isValid: false,
      error: 'No external service id.'
    };
  }
  // Validate title
  if (!taskData.title || taskData.title.length > 255) {
    return {
      isValid: false,
      error: 'Title is required and must be less than or equal to 255 characters.'
    };
  }

  // Validate description
  // Description is optional and can be any length of text

  // Validate status
  const validStatuses = ['To Do', 'In Progress', 'Completed'];
  if (!validStatuses.includes(taskData.status)) {
    return {
      isValid: false,
      error: 'Status must be one of the following: To Do, In Progress, Completed.'
    };
  }

  // Validate due_date
  if (taskData.due_date) {
    const dueDate = new Date(taskData.due_date);
    if (isNaN(dueDate.getTime())) {
      return {
        isValid: false,
        error: 'Due date must be a valid date.'
      };
    }
  }

  // If all validations pass, return an object indicating success
  return {
    isValid: true,
    error: null
  };
}

module.exports = validateCreateTaskData