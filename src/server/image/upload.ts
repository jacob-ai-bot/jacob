import { type Request, type Response } from "express";
import {
  getSignedUrl,
  resizeImageForGptVision,
  uploadToS3,
  IMAGE_TYPE,
} from "../utils/images";

const bucketName = process.env.BUCKET_NAME ?? "";

interface Body {
  image: unknown;
  imageType?: string;
  imageName?: string;
  shouldResize?: boolean;
}

export async function uploadImage(req: Request, res: Response) {
  try {
    const {
      image,
      imageType,
      imageName,
      shouldResize = false,
    } = req.body as Body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid image - expected base64 encoded string",
      });
    }

    if (!imageType || !(imageType in IMAGE_TYPE)) {
      return res.status(400).json({
        success: false,
        message: "Invalid imageType - expected image/jpeg or image/png",
      });
    }
    const verifiedImageType = imageType as IMAGE_TYPE;

    let imageBuffer = Buffer.from(image, "base64");
    if (shouldResize) {
      imageBuffer = await resizeImageForGptVision(
        imageBuffer,
        verifiedImageType,
      );
    }
    const imagePath = await uploadToS3(
      imageBuffer,
      verifiedImageType,
      bucketName,
      imageName,
    );
    const url = await getSignedUrl(imagePath, bucketName);
    return res.status(200).json({ success: true, url });
  } catch (error) {
    console.log("Error uploading image", error);
    return res.status(500).json({ success: false });
  }
}
