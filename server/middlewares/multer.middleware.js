import multer from "multer";
import fs from "fs";
import path from "path";

// Define the upload directory
const uploadDir = "./public/temp";

// Create the directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Store uploaded files in "public/temp"
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// File filter to accept only Excel and CSV files (.xlsx, .xls, .csv)
const excelFileFilter = (req, file, cb) => {
  // Get the file extension without the dot
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Define allowed extensions and MIME types
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'text/csv', // csv
    'application/csv' // csv alternative
  ];

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel and CSV files are allowed (.xlsx, .xls, .csv)"));
  }
};

const pdfFileFilter = (req, file, cb) => {
  // Get the file extension without the dot
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Define allowed extensions and MIME types
  const allowedExtensions = ['.pdf'];
  const allowedMimeTypes = [
    'application/pdf'
  ];

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed (.pdf)"));
  }
}

export const uploadExcel = multer({ 
  storage, 
  excelFileFilter,
});

export const uploadPdf = multer({
  storage,
  pdfFileFilter,
});