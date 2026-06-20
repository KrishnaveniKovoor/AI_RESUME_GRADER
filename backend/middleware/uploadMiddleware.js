const multer = require('multer');

// Use memoryStorage so files are kept in req.file.buffer.
// Render (and most cloud hosts) have ephemeral disks — diskStorage
// files are wiped on every restart, causing 500 errors on upload.
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and DOCX uploads are allowed.'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

module.exports = upload;

