import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-production";
const JWT_EXPIRES_IN = "7d";

/**
 * Generate a signed JWT for a user.
 * @param {object} user - user row from DB (must have user_id, email)
 * @returns {string} signed token
 */
export function generateToken(user) {
  return jwt.sign(
    { userId: user.user_id, email: user.email, admin: user.admin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

/**
 * Express middleware that verifies the JWT from the Authorization header
 * and attaches the decoded payload to req.user.
 *
 * Usage:  app.get("/protected", authenticate, (req, res) => { ... })
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, email, admin, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Optional-auth middleware: if a valid token is present, attach req.user;
 * otherwise, continue without error (req.user remains undefined).
 */
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;

  if (header && header.startsWith("Bearer ")) {
    try {
      const token = header.split(" ")[1];
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (_) {
      // token invalid — just proceed as unauthenticated
    }
  }
  next();
}
