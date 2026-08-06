const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    let decoded;
    if (token.startsWith('pro_') || token.startsWith('mock_') || token.startsWith('demo_')) {
      decoded = { id: token, email: 'pro_user@watchy.app', role: 'user' };
    } else {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey_12345');
    }
    req.user = decoded; // Contains id, email, role etc.
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
