const auth = require('./auth');
const Audit = require('../models/Audit');
const { production } = require('../config/runtime');
module.exports = (...roles) => [auth, async (req, res, next) => {
  try {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission for this action.' });
    if ((production || process.env.REQUIRE_ADMIN_MFA === 'true') && (!req.user.mfa_enabled || !req.session.mfaVerified)) return res.status(403).json({ error: 'Set up two-step verification in Account security before using administration.', code: 'MFA_REQUIRED' });
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      const entry = await Audit.create({ actor_id: req.user.id, action: req.method, target: req.originalUrl.split('?')[0] });
      res.on('finish', () => { Audit.updateOne({ _id: entry._id }, { outcome: res.statusCode < 400 ? 'completed' : 'failed', status: res.statusCode }).catch(() => console.error('Audit completion could not be recorded.')); });
    }
    next();
  } catch (error) { next(error); }
}];
