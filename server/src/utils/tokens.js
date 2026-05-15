const jwt = require("jsonwebtoken");

function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, prn: user.prn || null, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

module.exports = { signAccessToken };

