function required(fields, body) {
  const missing = fields.filter((f) => !body[f] && body[f] !== 0);
  if (missing.length) {
    return `Missing required fields: ${missing.join(', ')}`;
  }
  return null;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = { required, isValidEmail };
