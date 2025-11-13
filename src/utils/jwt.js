import jwt from "jsonwebtoken";

// generate short-lived access token
/*
 * { user_id: user.id, email: user.email } -> payload (identify user)
 * process.env.JWT_SECRET -> secret key to sign the token
 * { expiresIn: '1h' } -> options (token expiration)
 */
export function generateAccessToken(user) {
    return jwt.sign(
        { user_id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1h"}
    );
}

// generate long-lived refresh token
/*
 * { user_id: user.id, email: user.email } -> payload (identify user)
 * process.env.JWT_SECRET -> secret key to sign the token
 * { expiresIn: process.env.REFRESH_EXPIRES_IN || "30d" } -> options (token expiration)
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    { user_id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRES_IN || "30d" }
  );
}

// middleware to verify access tokens on protected routes
/*
 * Checks Authorization header for Bearer token.
 * If valid, attaches decoded payload to req.user and calls next().
 * If missing/invalid/expired, responds with 401/403 error.
 */
export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Distinguish expired token so client can trigger refresh flow
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          error: "token_expired",
          message: "Access token has expired",
          expiredAt: err.expiredAt || null,
        });
      }
      // Invalid signature, malformed token, etc.
      return res.status(401).json({ error: "invalid_token", message: "Invalid access token" });
    }

    req.user = decoded; // attach payload to request
    next();
  });
}