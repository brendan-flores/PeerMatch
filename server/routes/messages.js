const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

const router = express.Router();

router.get('/conversation/:otherUserId', authMiddleware, (req, res) =>
  void messageController.getConversation(req, res),
);

router.get('/conversations', authMiddleware, (req, res) =>
  void messageController.getConversations(req, res),
);

router.get('/unread-count', authMiddleware, (req, res) =>
  void messageController.getUnreadCount(req, res),
);

router.post('/seen', authMiddleware, (req, res) =>
  void messageController.markSeen(req, res),
);

router.post('/:messageId/remove-for-me', authMiddleware, (req, res) =>
  void messageController.removeMessageForMe(req, res),
);

router.post('/:messageId/vanish-for-me', authMiddleware, (req, res) =>
  void messageController.vanishIncomingMessageForViewer(req, res),
);

router.post('/:messageId/reactions', authMiddleware, (req, res) =>
  void messageController.setMessageReaction(req, res),
);

// Static path before `/:messageId` so "conversation" is never captured as a message id.
router.delete('/conversation/:otherUserId', authMiddleware, (req, res) =>
  void messageController.deleteConversation(req, res),
);

router.delete('/:messageId', authMiddleware, (req, res) =>
  void messageController.deleteMessage(req, res),
);

module.exports = router;
