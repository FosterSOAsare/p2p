import { Router } from "express";
import multer from "multer";
import asyncHandler from "express-async-handler";
import { auth } from "../../shared/middleware/auth.middleware";
import { ApiError } from "../../shared/lib/errors";
import * as uploadService from "./upload.service";

// Multer memory storage (holds file in memory buffer for Cloudinary upload_stream)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file limit
  },
  fileFilter: (_req, file, cb) => {
    // Allow images, PDFs, and text documents
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Please upload images (JPG, PNG, WebP) or PDF documents."));
    }
  },
});

export const uploadRouter = Router();

// Signed-in users can upload files
uploadRouter.use(auth);

/** POST /api/upload/single — Upload 1 file to Cloudinary */
uploadRouter.post(
  "/single",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw ApiError.badRequest("No file uploaded. Please attach a file in the 'file' form field.");

    const result = await uploadService.uploadFileBuffer(file.buffer, file.mimetype, file.originalname);
    res.json(result);
  }),
);

/** POST /api/upload/multiple — Upload up to 5 files to Cloudinary */
uploadRouter.post(
  "/multiple",
  upload.array("files", 5),
  asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw ApiError.badRequest("No files uploaded. Please attach files in the 'files' form field.");
    }

    const uploadPromises = files.map((f) =>
      uploadService.uploadFileBuffer(f.buffer, f.mimetype, f.originalname),
    );
    const results = await Promise.all(uploadPromises);

    res.json({ files: results });
  }),
);
