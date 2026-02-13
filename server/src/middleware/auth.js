const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  // Try cookie first, then Authorization header
  let token = req.cookies?.accessToken;

  if (!token) {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      token = header.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function authorizeOrg(...roles) {
  return (req, res, next) => {
    if (!req.user.orgRole || !roles.includes(req.user.orgRole)) {
      return res.status(403).json({ error: 'Organization-level access required' });
    }
    next();
  };
}

module.exports = { authenticate, authorize, authorizeOrg };
