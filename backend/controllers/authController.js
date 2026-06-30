import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper function to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  const { username, email, password, avatar } = req.body;

  if (!username || !email || !password) {
    res.status(400);
    return next(new Error('Please fill in all required fields'));
  }

  try {
    // Check if user already exists (by email or username)
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      res.status(400);
      return next(new Error('Username or Email already exists'));
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      return next(new Error('Invalid user data'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const authUser = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    return next(new Error('Please provide email and password'));
  }

  try {
    // Find user by email and select password since password select is false in model
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      // Set online status in DB
      user.isOnline = true;
      await user.save();

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        token: generateToken(user._id),
      });
    } else {
      res.status(401);
      return next(new Error('Invalid email or password'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isOnline: user.isOnline,
      });
    } else {
      res.status(404);
      return next(new Error('User not found'));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Search users by username or email
// @route   GET /api/auth/users?search=john
// @access  Private
export const searchUsers = async (req, res, next) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { username: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
          ],
        }
      : {};

    // Search users matching search filter, excluding current user
    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate Google user
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = async (req, res, next) => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400);
    return next(new Error('Google credential token is required'));
  }

  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      res.status(500);
      return next(new Error('Google Client ID is not configured on the server. Please add GOOGLE_CLIENT_ID to your .env file.'));
    }

    // Verify Google ID Token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      user.isOnline = true;
      await user.save();
    } else {
      // Create user if they don't exist
      let username = name.replace(/\s+/g, '_').toLowerCase();
      
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        username = `${username}_${Math.floor(Math.random() * 1000)}`;
      }

      const randomPassword = Math.random().toString(36).slice(-10);

      user = await User.create({
        username,
        email,
        password: randomPassword,
        avatar: picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`,
        isOnline: true,
      });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(400);
    return next(new Error(`Google authentication failed: ${error.message}`));
  }
};

// @desc    Update user profile (username/avatar)
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
  const { username, avatar } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      return next(new Error('User not found'));
    }

    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        res.status(400);
        return next(new Error('Username is already taken'));
      }
      user.username = username;
    }

    if (avatar) {
      user.avatar = avatar;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      token: generateToken(updatedUser._id),
    });
  } catch (error) {
    next(error);
  }
};

