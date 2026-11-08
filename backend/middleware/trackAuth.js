const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/b2c');

/**
 * Safe user identity resolver for tracking and recommendations.
 * NEVER trusts raw 'userid' headers without a verified JWT token.
 * Populates req.userId (or null) and req.anonymousId.
 */
function resolveUserIdentity(req, res, next) {
  req.userId = null;
  req.userRole = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token && token !== 'null' && token !== 'undefined') {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && (decoded.id || decoded._id)) {
          req.userId = (decoded.id || decoded._id).toString();
          req.userRole = decoded.role || null;
        }
      } catch (err) {
        // Expired or invalid token: treat strictly as unauthenticated guest
        req.userId = null;
      }
    }
  }

  // Extract anonymousId cleanly
  const rawAnon = req.headers['x-anonymous-id'] || req.body?.anonymousId || req.query?.anonymousId;
  if (rawAnon && typeof rawAnon === 'string') {
    // Sanitize anonymousId: only alphanumeric and dashes/underscores, max length 64
    const cleanAnon = rawAnon.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    req.anonymousId = cleanAnon || null;
  } else {
    req.anonymousId = null;
  }

  next();
}

/**
 * Strict authentication guard for user-specific operations (e.g. merge)
 */
function requireVerifiedUser(req, res, next) {
  resolveUserIdentity(req, res, () => {
    if (!req.userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập với token hợp lệ để thực hiện thao tác này' });
    }
    next();
  });
}

module.exports = {
  resolveUserIdentity,
  requireVerifiedUser
};

