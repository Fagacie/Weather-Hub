const { sendJson, sendError } = require('../lib/response');
const { validateContact } = require('../lib/validators');
const { getDatabase } = require('../lib/firebaseAdmin');

async function handleContact(req, res) {
  if (req.method !== 'POST') {
    sendError(res, 405, 'Method not allowed');
    return;
  }

  const validation = validateContact(req.body);
  if (!validation.ok) {
    sendError(res, 400, validation.message);
    return;
  }

  const { name, email, message } = validation.data;

  try {
    const ref = getDatabase().ref('contactMessages').push();
    await ref.set({
      name,
      email,
      message,
      createdAt: new Date().toISOString(),
      status: 'new'
    });

    sendJson(res, 201, { ok: true, id: ref.key }, 0);
  } catch (err) {
    console.error('Contact save failed:', err);
    sendError(res, 500, 'Failed to save your message. Please try again later.');
  }
}

module.exports = { handleContact };
