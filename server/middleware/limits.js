const { RateLimiterMongo } = require('rate-limiter-flexible');
const { createHash } = require('node:crypto');
const mongoose = require('mongoose');
const pools = new Map();
module.exports = (name, points, duration, keyFn = req => req.ip) => async (req, res, next) => {
  const ready = mongoose.connection.readyState === 1 && mongoose.connection.getClient && mongoose.connection.getClient();
  if (!ready) return next();

  let pool = pools.get(name);
  if (!pool) {
    try {
      pool = new RateLimiterMongo({ storeClient: ready, dbName: mongoose.connection.name, tableName: 'rate_limits', keyPrefix: name, points, duration });
      pools.set(name, pool);
    } catch (error) {
      return next();
    }
  }

  try { await pool.consume(createHash('sha256').update(String(keyFn(req))).digest('hex')); next(); }
  catch (result) {
    if (!(result instanceof Error)) { res.set('Retry-After', String(Math.ceil(result.msBeforeNext/1000))); return res.status(429).json({ error: 'Too many attempts. Please wait and try again.' }); }
    next(result);
  }
};
