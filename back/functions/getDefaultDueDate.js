function getDefaultDueDate () {
  // Create a new Date object for today
  var today = new Date();

  // Add 5 days to today's date
  today.setDate(today.getDate() + 5);

  // Format the date in 'YYYY-MM-DD' format
  var formattedDate = today.getFullYear() + '-' + ('0' + (today.getMonth() + 1)).slice(-2) + '-' + ('0' + today.getDate()).slice(-2);

  return formattedDate
}

module.exports = getDefaultDueDate