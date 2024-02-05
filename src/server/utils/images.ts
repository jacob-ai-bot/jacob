import Jimp from "jimp";
import AWS from "aws-sdk";

export enum IMAGE_TYPE {
  JPEG = "image/jpeg",
  PNG = "image/png",
}

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

export const uploadToS3 = async (
  imageBuffer: Buffer,
  imageType: IMAGE_TYPE,
  bucketName: string,
  imagePath?: string | undefined,
) => {
  const key = imagePath ?? `uploads/${Date.now()}.png`;
  const params = {
    Bucket: bucketName,
    Key: key,
    Body: imageBuffer,
    ContentType: imageType as string,
  };
  await s3.upload(params).promise();
  return key;
};

export const getSignedUrl = (
  imagePath: string,
  bucketName: string,
  expiresInSeconds: number = 3600,
) => {
  const params = {
    Bucket: bucketName,
    Key: imagePath,
    Expires: expiresInSeconds,
  };
  return s3.getSignedUrl("getObject", params);
};

// Resize the image to optimize them for cost and performance as per OpenAI's vision API requirements (https://platform.openai.com/docs/guides/vision)
// Images are first scaled to fit within a 2048 x 2048 square, maintaining their aspect ratio.
// Then, they are scaled such that the shortest side of the image is 768px long, while the longest side must be less than 2000px.
export const resizeImageForGptVision = async (
  imageBuffer: Buffer,
  imageType: IMAGE_TYPE,
): Promise<Buffer> => {
  try {
    const jimpImageType =
      imageType === IMAGE_TYPE.JPEG ? Jimp.MIME_JPEG : Jimp.MIME_PNG;

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

    // make sure that the largest side is less than 2000px
    width = imageJimp.getWidth();
    height = imageJimp.getHeight();
    if (width > 2000 || height > 2000) {
      if (width > height) {
        imageJimp.resize(2000, Jimp.AUTO);
      } else {
        imageJimp.resize(Jimp.AUTO, 2000);
      }
    }

    return await imageJimp.getBufferAsync(jimpImageType);
  } catch (error) {
    console.log("error resizing image", error);
    return imageBuffer;
  }
};
