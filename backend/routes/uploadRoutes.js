import express from 'express';
import multer from 'multer';
import path from 'path';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Define Disk Storage settings for Multer
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    // Generate unique file names
    cb(
      null,
      `avatar-${req.user._id}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

// Check file types (Images only)
function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed!'));
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 2000000 }, // Max 2MB file size limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// Upload route
router.post('/', protect, upload.single('image'), (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      return next(new Error('Please upload an image file'));
    }
    
    // Send back the full server URL path
    res.json({
      filePath: `http://localhost:5000/uploads/${req.file.filename}`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
