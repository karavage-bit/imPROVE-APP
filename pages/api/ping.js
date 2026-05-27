export default function handler(req, res) {
  res.status(200).json({ ok: true, message: 'routing works', ts: Date.now() });
}
