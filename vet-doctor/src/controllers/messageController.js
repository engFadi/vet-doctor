// ----------------------------------------------------------------------
// Message controller (SR7.7-7.11)
// Appointment conversation between the client and the assigned vet. Access
// is restricted to those two participants (SR7.8); messaging is open while
// the appointment is active (SR7.7); history stays viewable afterwards.
// ----------------------------------------------------------------------
const db = require('../models');
const notificationService = require('../services/notificationService');
const { isActive } = require('../utils/appointmentStatus');

const { Op } = db.Sequelize;
const Appointment = db.Appointment;
const Message = db.Message;
const User = db.User;

// Load an appointment only if the logged-in user is its client or vet.
function findParticipantAppointment(req) {
  const uid = req.session.user.id;
  return Appointment.findOne({
    where: { id: req.params.id, [Op.or]: [{ clientId: uid }, { veterinarianId: uid }] },
    include: [
      { model: db.Service, as: 'service' },
      { model: User, as: 'client', attributes: ['id', 'fullName'] },
      { model: User, as: 'veterinarian', attributes: ['id', 'fullName'] },
    ],
  });
}

// GET /appointments/:id/messages - the conversation thread
exports.thread = async (req, res, next) => {
  try {
    const appointment = await findParticipantAppointment(req);
    if (!appointment) {
      req.flash('error', 'Conversation not found or you do not have access to it.');
      return res.redirect('/dashboard');
    }

    const messages = await Message.findAll({
      where: { appointmentId: appointment.id },
      include: [{ model: User, as: 'sender', attributes: ['id', 'fullName', 'role'] }],
      order: [['createdAt', 'ASC']],
    });

    res.render('pages/messages', {
      title: 'Messages - Vet Doctor',
      appointment,
      messages,
      canSend: isActive(appointment.status), // SR7.7
      currentUserId: req.session.user.id,
    });
  } catch (err) {
    next(err);
  }
};

// POST /appointments/:id/messages - send a text and/or image message
exports.send = async (req, res, next) => {
  try {
    const appointment = await findParticipantAppointment(req);
    if (!appointment) {
      req.flash('error', 'Conversation not found or you do not have access to it.');
      return res.redirect('/dashboard');
    }
    const threadUrl = `/appointments/${appointment.id}/messages`;

    if (!isActive(appointment.status)) {
      req.flash('error', 'Messaging is closed for this appointment.');
      return res.redirect(threadUrl);
    }

    const body = (req.body.body || '').trim();
    const imageFile = req.file ? req.file.filename : null;
    if (!body && !imageFile) {
      req.flash('error', 'Please type a message or attach an image.');
      return res.redirect(threadUrl);
    }

    await Message.create({
      appointmentId: appointment.id,
      senderId: req.session.user.id,
      body: body || null,
      imageFile,
    });

    // Notify the other participant (SR7.8 keeps it to the two of them).
    const recipientId =
      req.session.user.id === appointment.clientId
        ? appointment.veterinarianId
        : appointment.clientId;
    await notificationService.notify({
      userId: recipientId,
      subject: 'New appointment message',
      body: `You have a new message about your ${appointment.service ? appointment.service.name : 'appointment'}.`,
      appointmentId: appointment.id,
    });

    return res.redirect(threadUrl);
  } catch (err) {
    return next(err);
  }
};
