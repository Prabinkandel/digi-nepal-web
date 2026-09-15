const User = require('../models/User');
const { fail } = require('../utils/validation');
module.exports = async (req, res, next) => {
  if (!req.session.userId) return next(Object.assign(new Error('Please sign in to continue.'), { status: 401 }));
  try {
    const user = await User.findOne({ id: req.session.userId }).select('-password -__v');
    if (!user || user.is_active !== 1 || (user.auth_version || 0) !== req.session.authVersion) { req.session.destroy(() => {}); fail(401, 'Your session has ended. Please sign in again.'); }
    if (Date.now() - req.session.signedInAt > 8*60*60*1000) { req.session.destroy(() => {}); fail(401, 'Please sign in again.'); }
    req.user = user; next();
  } catch (e) { next(e); }
};
