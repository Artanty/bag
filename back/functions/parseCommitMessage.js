function parseCommitMessage(message) {
  console.log(message)
  if (typeof message !== 'string') {
    throw new Error('message is not a string')
  }
  // Regular expression pattern
  // both valid:
  // PLAN-next
  // PLAN-0110
  const pattern = /^\* ([a-z]+): ([A-Z]{2,4}-\w{4}) (.+);$/;

  // Match the message against the pattern
  const match = message.match(pattern);

  // If the message matches the pattern, return the segments
  if (match) {
    const [_, type, taskId, text] = match;
    return { type, taskId, text };
  }

  throw new Error('Wrong commit structure while parsing')
}

module.exports = parseCommitMessage

