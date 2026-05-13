const ContactMessage = require("../models/ContactMessage");

const allowedTypes = new Set(["feedback", "query", "problem"]);

const submitContactMessage = async (req, res) => {
  const { name, email, type, message } = req.body;

  if (!name || !email || !type || !message) {
    return res
      .status(400)
      .json({ message: "name, email, type and message are required" });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const normalizedType = String(type).toLowerCase().trim();

  if (!allowedTypes.has(normalizedType)) {
    return res.status(400).json({ message: "type must be feedback, query or problem" });
  }

  const doc = await ContactMessage.create({
    name: String(name).trim(),
    email: normalizedEmail,
    type: normalizedType,
    message: String(message).trim(),
  });

  return res.status(201).json({
    message: "Contact message submitted successfully",
    contact: {
      id: doc._id,
      name: doc.name,
      email: doc.email,
      type: doc.type,
      createdAt: doc.createdAt,
    },
  });
};

module.exports = {
  submitContactMessage,
};
