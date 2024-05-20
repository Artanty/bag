function fillWithLeadingZeros(str) {
  // Convert the string to a number to remove any leading zeros
  const num = Number(str);
  // Convert the number back to a string and pad it with leading zeros
  const paddedStr = num.toString().padStart(4, '0');
  return paddedStr;
}

module.exports = fillWithLeadingZeros