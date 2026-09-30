process.env.NODE_ENV = 'test';
process.env.LOCAL_AUTH_AUTO_VERIFY = 'true';
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const request = require('supertest');
const sharp = require('sharp');
const { after } = require('node:test');
const app = require('../server/server');

test('login returns a token alias expected by the static frontend', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@diginepal.com', password: 'admin123' })
    .expect(200);

  assert.equal(res.body.user.email, 'admin@diginepal.com');
  assert.equal(res.body.user.role, 'admin');
  assert.equal(res.body.token, res.body.csrf);
});

test('local development registration creates a usable session', async () => {
  const email = `member-${randomUUID()}@example.test`;
  const password = 'A secure local password 2026!';
  const registration = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Local Member', email, password })
    .expect(201);

  assert.equal(registration.body.user.email, email);
  assert.equal(registration.body.local_auto_verified, true);
  assert.ok(registration.body.csrf);

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  assert.equal(login.body.user.email, email);
});

test('customer can create an order and submit payment proof for verification', async () => {
  const agent = request.agent(app);
  const email = `payer-${randomUUID()}@example.test`;
  const password = 'A secure local password 2026!';
  const registration = await agent
    .post('/api/auth/register')
    .send({ name: 'Payment Customer', email, password })
    .expect(201);
  const csrf = registration.body.csrf;
  const catalog = await agent.get('/api/products?limit=1').expect(200);
  const order = await agent
    .post('/api/orders')
    .set('x-csrf-token', csrf)
    .send({ product_id: catalog.body.items[0].id, request_key: randomUUID() })
    .expect(201);
  const receipt = await sharp({ create: { width: 20, height: 20, channels: 3, background: { r: 229, g: 9, b: 20 } } }).png().toBuffer();
  const media = await agent
    .post('/api/upload')
    .set('x-csrf-token', csrf)
    .field('purpose', 'receipt')
    .attach('image', receipt, 'receipt.png')
    .expect(201);
  const payment = await agent
    .post('/api/payments')
    .set('x-csrf-token', csrf)
    .send({ order_id: order.body.id, payer_name: 'Payment Customer', transaction_id: 'LOCAL-TEST-2026', payment_method: 'eSewa', phone: '', note: '', media_id: media.body.id });

  assert.equal(payment.status, 201, JSON.stringify(payment.body));
  assert.ok(payment.body.payment_id);
});

after(async () => {
  await require('../server/config/db').close();
});
