import Message from '../models/Message.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';

// @desc    Send a new Message
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    res.status(400);
    return next(new Error('Content and ChatID are required'));
  }

  const newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
  };

  try {
    let message = await Message.create(newMessage);

    // Populate sender name and avatar, and the chat details
    message = await message.populate('sender', 'username avatar');
    message = await message.populate('chat');
    message = await User.populate(message, {
      path: 'chat.users',
      select: 'username avatar email isOnline',
    });

    // Update the Chat model's latest message field
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message,
    });

    res.status(200).json(message);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Messages for a Chat
// @route   GET /api/messages/:chatId
// @access  Private
export const allMessages = async (req, res, next) => {
  const { chatId } = req.params;

  if (!chatId) {
    res.status(400);
    return next(new Error('ChatID parameter is required'));
  }

  try {
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username avatar email')
      .populate('chat');

    res.json(messages);
  } catch (error) {
    next(error);
  }
};
