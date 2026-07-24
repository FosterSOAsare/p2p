import { v2 as cloudinary } from "cloudinary";
import { env } from "../../shared/config/env";
import { ApiError } from "../../shared/lib/errors";

// Configure Cloudinary from env variables
const cloudName = env.CLOUDINARY_CLOUD_NAME;
const apiKey = env.CLOUDINARY_API_KEY;
const apiSecret = env.CLOUDINARY_API_SECRET;
const cloudinaryUrl = env.CLOUDINARY_URL;

const isCloudinaryConfigured = Boolean(cloudinaryUrl || (cloudName && apiKey && apiSecret));

if (cloudinaryUrl) {
  cloudinary.config({ cloudinary_url: cloudinaryUrl });
} else if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

export interface UploadResult {
  url: string;
  publicId: string;
  originalName: string;
  size: number;
}

/** Upload a single file buffer to Cloudinary */
export async function uploadFileBuffer(
  buffer: Buffer,
  mimetype: string,
  originalName: string,
  folder = "p2p_trust_market",
): Promise<UploadResult> {
  if (!buffer || buffer.length === 0) {
    throw ApiError.badRequest("Empty file buffer provided");
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || env.CLOUDINARY_API_SECRET;
  const cloudinaryUrl = process.env.CLOUDINARY_URL || env.CLOUDINARY_URL;

  const isConfigured = Boolean(cloudinaryUrl || (cloudName && apiKey && apiSecret));

  // If Cloudinary keys are missing, throw an explicit error informing the user
  if (!isConfigured) {
    console.error("❌ Cloudinary Error: Missing API keys in server/.env");
    throw ApiError.badRequest(
      "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your server/.env file."
    );
  }

  if (cloudinaryUrl) {
    cloudinary.config({ cloudinary_url: cloudinaryUrl });
  } else {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }

  console.log(`📤 Uploading file "${originalName}" (${mimetype}, ${buffer.length} bytes) to Cloudinary...`);

  // Upload to Cloudinary stream
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: mimetype.startsWith("image/") ? "image" : "auto",
      },
      (error, result) => {
        if (error || !result) {
          console.error("❌ Cloudinary Upload Failed Error Response:", JSON.stringify(error, null, 2));
          return reject(
            new ApiError(500, `Cloudinary upload failed: ${error?.message || "Unknown Cloudinary error"}`)
          );
        }

        console.log("✅ Cloudinary Upload Success Response:", {
          public_id: result.public_id,
          secure_url: result.secure_url,
          format: result.format,
          bytes: result.bytes,
        });

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          originalName,
          size: result.bytes,
        });
      },
    );

    uploadStream.end(buffer);
  });
}
