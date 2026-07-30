const jwt = require('jsonwebtoken');

function getTokenFromHeader(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

// Blocks the request entirely if there's no valid token. Use on routes that
// only make sense for a logged-in user (GET /api/links, DELETE /api/links/:code).
function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, email: payload.email };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Attaches req.user if a valid token is present, but never blocks the
// request — used on POST /api/shorten so anonymous shortening still works
// (owner_id is nullable) while logged-in users get their links attributed.
function optionalAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.id, email: payload.email };
    } catch (err) {
      // Invalid/expired token on an optional-auth route: proceed as
      // anonymous rather than failing the request.
    }
  }
  return next();
}

module.exports = { requireAuth, optionalAuth };
