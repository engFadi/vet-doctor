// ----------------------------------------------------------------------
// Message routes (SR7.7-7.11)
// Shared by client and vet; access is enforced in the controller (only the
// appointment's two participants). Mounted at /appointments.
// ----------------------------------------------------------------------
const express = require('express');
const router = express.Router();

const messageController = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(requireAuth);

// Wrap multer so an oversized/failed image becomes a friendly flash (SR5.11 limit).
function uploadImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      req.flash(
        'error',
        err.code === 'LIMIT_FILE_SIZE' ? 'Image exceeds the 10 MB limit.' : 'Image upload failed.'
      );
      return res.redirect(`/appointments/${req.params.id}/messages`);
    }
    return next();
  });
}

router.get('/:id/messages', messageController.thread);
router.post('/:id/messages', uploadImage, messageController.send);

module.exports = router;
