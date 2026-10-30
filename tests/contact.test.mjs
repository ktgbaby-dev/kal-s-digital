// Tests for api/contact.js. Run with:  node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Readable } from "node:stream";

const require = createRequire(import.meta.url);
const handler = require("../api/contact.js");

const CONFIGURED = { RESEND_API_KEY: "test-key", CONTACT_TO_EMAIL: "inbox@example.test" };
const GOOD = { name: "Ada Obi", business: "Ada Studio", email: "ada@example.test", phone: "0803 123 4567", interest: "kard", message: "We need cards and a landing page for our studio." };

function request(method, body, type = "application/json", ip = "203.0.113.1") {
  const raw = body === undefined ? "" : typeof body === "string" ? body : JSON.stringify(body);
  const req = Readable.from(raw ? [Buffer.from(raw)] : []);
  req.method = method;
  req.headers = { "content-type": type, "x-forwarded-for": ip };
  return req;
}

function response() {
  const res = { statusCode: 0, headers: {}, body: "" };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.end = (b) => { res.body = b || ""; };
  res.json = () => JSON.parse(res.body);
  return res;
}

function fakeFetch(status = 200) {
  const calls = [];
  const fn = async (url, init) => { calls.push({ url, init }); return { ok: status >= 200 && status < 300, status }; };
  fn.calls = calls;
  return fn;
}

test("GET reports email delivery off when not configured", async () => {
  const res = response();
  await handler(request("GET"), res, { env: {} });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { email: false });
});

test("GET reports email delivery on only when both key and inbox are set", async () => {
  const res = response();
  await handler(request("GET"), res, { env: CONFIGURED });
  assert.deepEqual(res.json(), { email: true });
  const half = response();
  await handler(request("GET"), half, { env: { RESEND_API_KEY: "k" } });
  assert.deepEqual(half.json(), { email: false });
});

test("valid enquiry is sent to Resend with reply-to set to the visitor", async () => {
  handler._resetRateLimit();
  const f = fakeFetch(200);
  const res = response();
  await handler(request("POST", GOOD), res, { env: CONFIGURED, fetch: f });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true });
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, "https://api.resend.com/emails");
  assert.equal(f.calls[0].init.headers.Authorization, "Bearer test-key");
  const sent = JSON.parse(f.calls[0].init.body);
  assert.deepEqual(sent.to, ["inbox@example.test"]);
  assert.equal(sent.reply_to, "ada@example.test");
  assert.match(sent.subject, /KARD/);
  assert.match(sent.text, /We need cards and a landing page/);
});

test("nothing is sent and 503 is returned when delivery is not configured", async () => {
  handler._resetRateLimit();
  const f = fakeFetch(200);
  const res = response();
  await handler(request("POST", GOOD), res, { env: {}, fetch: f });
  assert.equal(res.statusCode, 503);
  assert.equal(res.json().error, "not_configured");
  assert.equal(f.calls.length, 0);
});

test("missing and malformed fields are rejected with field messages", async () => {
  handler._resetRateLimit();
  const f = fakeFetch(200);
  const res = response();
  await handler(request("POST", { name: "", email: "not-an-email", interest: "pizza", message: "hi", phone: "abc" }), res, { env: CONFIGURED, fetch: f });
  assert.equal(res.statusCode, 400);
  const { errors } = res.json();
  assert.deepEqual(Object.keys(errors).sort(), ["email", "interest", "message", "name", "phone"]);
  assert.equal(f.calls.length, 0);
});

test("over-long message is rejected", async () => {
  handler._resetRateLimit();
  const res = response();
  await handler(request("POST", { ...GOOD, message: "x".repeat(4001) }), res, { env: CONFIGURED, fetch: fakeFetch() });
  assert.equal(res.statusCode, 400);
  assert.ok(res.json().errors.message);
});

test("honeypot submissions get a quiet success and send nothing", async () => {
  handler._resetRateLimit();
  const f = fakeFetch(200);
  const res = response();
  await handler(request("POST", { ...GOOD, company_website: "spam.example" }), res, { env: CONFIGURED, fetch: f });
  assert.equal(res.statusCode, 200);
  assert.equal(f.calls.length, 0);
});

test("provider failure is reported as not delivered", async () => {
  handler._resetRateLimit();
  const res = response();
  await handler(request("POST", GOOD), res, { env: CONFIGURED, fetch: fakeFetch(500) });
  assert.equal(res.statusCode, 502);
  assert.equal(res.json().error, "delivery_failed");
});

test("rate limit stops the sixth message from one address within ten minutes", async () => {
  handler._resetRateLimit();
  const f = fakeFetch(200);
  let last;
  for (let i = 0; i < 6; i++) {
    last = response();
    await handler(request("POST", GOOD, "application/json", "198.51.100.7"), last, { env: CONFIGURED, fetch: f, now: () => 1000 + i });
  }
  assert.equal(last.statusCode, 429);
  assert.equal(f.calls.length, 5);
});

test("form posts without JavaScript get an HTML answer, not JSON", async () => {
  handler._resetRateLimit();
  const form = new URLSearchParams(GOOD).toString();
  const res = response();
  await handler(request("POST", form, "application/x-www-form-urlencoded"), res, { env: {}, fetch: fakeFetch() });
  assert.equal(res.statusCode, 503);
  assert.match(res.headers["content-type"], /text\/html/);
  assert.match(res.body, /nothing was sent/);
});

test("invalid JSON and other methods are refused", async () => {
  const bad = response();
  await handler(request("POST", "{not json"), bad, { env: CONFIGURED, fetch: fakeFetch() });
  assert.equal(bad.statusCode, 400);
  const put = response();
  await handler(request("PUT", GOOD), put, { env: CONFIGURED });
  assert.equal(put.statusCode, 405);
});
