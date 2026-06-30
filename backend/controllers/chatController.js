import Chat from '../models/Chat.js';
import User from '../models/User.js';

// @desc    Create or retrieve a 1-to-1 Chat
// @route   POST /api/chats
// @access  Private
export const accessChat = async (req, res, next) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400);
    return next(new Error('UserId param not sent with request'));
  }

  try {
    // Check if a chat already exists between these two users
    let isChat = await Chat.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('users', '-password')
      .populate('latestMessage');

    // Populate sender info inside latest message
    isChat = await User.populate(isChat, {
      path: 'latestMessage.sender',
      select: 'username email avatar isOnline',
    });

    if (isChat.length > 0) {
      res.send(isChat[0]);
    } else {
      // Create new chat
      var chatData = {
        chatName: 'sender',
        isGroupChat: false,
        users: [req.user._id, userId],
      };

      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        'users',
        '-password'
      );
      res.status(200).json(fullChat);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get all chats for the logged-in user
// @route   GET /api/chats
// @access  Private
export const fetchChats = async (req, res, next) => {
  try {
    // Retrieve chats where current user is a participant
    let chats = await Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    // Populate sender info in the latest message
    chats = await User.populate(chats, {
      path: 'latestMessage.sender',
      select: 'username email avatar isOnline',
    });

    res.status(200).json(chats);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a Group Chat
// @route   POST /api/chats/group
// @access  Private
export const createGroupChat = async (req, res, next) => {
  if (!req.body.users || !req.body.name) {
    res.status(400);
    return next(new Error('Please fill in all the fields'));
  }

  // Parse users array (sent as stringified JSON from client)
  let users = JSON.parse(req.body.users);

  if (users.length < 2) {
    res.status(400);
    return next(new Error('More than 2 users are required to form a group chat'));
  }

  // Add the current logged-in user to the group
  users.push(req.user);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.status(200).json(fullGroupChat);
  } catch (error) {
    next(error);
  }
};

// @desc    Rename Group
// @route   PUT /api/chats/rename
// @access  Private
export const renameGroup = async (req, res, next) => {
  const { chatId, chatName } = req.body;

  if (!chatId || !chatName) {
    res.status(400);
    return next(new Error('Chat ID and Chat Name are required'));
  }

  try {
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName },
      { new: true } // Return the updated document
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!updatedChat) {
      res.status(404);
      return next(new Error('Chat Not Found'));
    }

    res.json(updatedChat);
  } catch (error) {
    next(error);
  }
};

// @desc    Add user to Group
// @route   PUT /api/chats/groupadd
// @access  Private
export const addToGroup = async (req, res, next) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    res.status(400);
    return next(new Error('Chat ID and User ID are required'));
  }

  try {
    const added = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!added) {
      res.status(404);
      return next(new Error('Chat Not Found'));
    }

    res.json(added);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove user from Group or Leave Group
// @route   PUT /api/chats/groupremove
// @access  Private
export const removeFromGroup = async (req, res, next) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    res.status(400);
    return next(new Error('Chat ID and User ID are required'));
  }

  try {
    const removed = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!removed) {
      res.status(404);
      return next(new Error('Chat Not Found'));
    }

    res.json(removed);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a Chat
// @route   DELETE /api/chats/:chatId
// @access  Private
export const deleteChat = async (req, res, next) => {
  const { chatId } = req.params;

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404);
      return next(new Error('Chat not found'));
    }

    // Check if the user is part of the chat
    const isMember = chat.users.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      res.status(401);
      return next(new Error('User not authorized to delete this chat'));
    }

    await Chat.findByIdAndDelete(chatId);
    res.status(200).json({ success: true, message: 'Conversation deleted successfully' });
  } catch (error) {
    next(error);
  }
};
