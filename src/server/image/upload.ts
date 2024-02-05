import { Request, Response } from "express";
import {
  getSignedUrl,
  resizeImageForGptVision,
  uploadToS3,
  IMAGE_TYPE,
} from "../utils/images";

const bucketName = process.env.BUCKET_NAME || "";

export async function uploadImage(req: Request, res: Response) {
  try {
    const { image, imageType, shouldResize = false } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid image - expected base64 encoded string",
      });
    }

    if (!imageType || ![IMAGE_TYPE.JPEG, IMAGE_TYPE.PNG].includes(imageType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid imageType - expected image/jpeg or image/png",
      });
    }

    let imageBuffer = Buffer.from(image, "base64");
    if (shouldResize) {
      imageBuffer = await resizeImageForGptVision(imageBuffer, imageType);
    }
    const imagePath = await uploadToS3(imageBuffer, imageType, bucketName);
    const url = getSignedUrl(imagePath, bucketName);
    return res.status(200).json({ success: true, url });
  } catch (error) {
    console.log("Error uploading image", error);
    return res.status(500).json({ success: false });
  }
}
