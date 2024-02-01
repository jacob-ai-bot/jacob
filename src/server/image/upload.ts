import { Request, Response } from "express";
import Jimp from "jimp";
import AWS from "aws-sdk";

enum IMAGE_TYPE {
  JPEG = "image/jpeg",
  PNG = "image/png",
}

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const bucketName = process.env.BUCKET_NAME || "";

export async function uploadSnapshot(req: Request, res: Response) {
  try {
    const { image, imageType } = req.body;
    const resizedImage = await resizeImage(image, imageType);
    const url = await uploadToS3(resizedImage, imageType);
    return res.status(200).json({ success: true, url });
  } catch (error) {
    console.log("Error uploading snapshot", error);
    return res.status(500).json({ success: false });
  }
}

const uploadToS3 = async (image: string, imageType: IMAGE_TYPE) => {
  // Remove the data URL prefix if present
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const key = `uploads/${Date.now()}.png`;

  // Upload to S3
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: imageType as string,
  };

  await s3.upload(params).promise();

  // Generate a signed URL
  const url = s3.getSignedUrl("getObject", {
    Bucket: bucketName,
    Key: key,
    Expires: 3600, // Expires in 1 hour
  });

  return url;
};

// Resize the image to optimize them for cost and performance as per OpenAI's vision API requirements (https://platform.openai.com/docs/guides/vision)
// Images are first scaled to fit within a 2048 x 2048 square, maintaining their aspect ratio. Then, they are scaled such that the shortest side of the image is 768px long.
const resizeImage = async (image: string, imageType: IMAGE_TYPE) => {
  try {
    const jimpImageType =
      imageType === IMAGE_TYPE.JPEG ? Jimp.MIME_JPEG : Jimp.MIME_PNG;

    const imageBuffer = Buffer.from(image, "base64");
    const imageJimp = await Jimp.read(imageBuffer);

    let width = imageJimp.getWidth();
    let height = imageJimp.getHeight();

    // Scale the image to fit within a 2048 x 2048 square
    if (width > 2048 || height > 2048) {
      imageJimp.scaleToFit(2048, 2048);
    }

    // Then scale the image such that the shortest side is 768px long
    width = imageJimp.getWidth();
    height = imageJimp.getHeight();
    if (width < height) {
      imageJimp.resize(768, Jimp.AUTO);
    } else {
      imageJimp.resize(Jimp.AUTO, 768);
    }

    const imageResized = await imageJimp.getBase64Async(jimpImageType);

    return imageResized;
  } catch (error) {
    console.log("error resizing image", error);
    return image;
  }
};
