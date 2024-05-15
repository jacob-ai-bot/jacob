import Jimp from "jimp";
import AWS from "aws-sdk";
import fetch from "node-fetch";
import { promises as fsPromises } from "fs";
import path from "path";
import { type RepoSettings } from "./settings";

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
  imageName?: string | undefined,
) => {
  const key = `uploads/${imageName ?? Date.now()}.${imageType.split("/")[1]}`;
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
  expiresInSeconds = 3600 * 24,
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

export const saveImages = async (
  existingImages: string,
  issueBody: string | null,
  rootPath: string,
  repoSettings?: RepoSettings,
): Promise<string> => {
  // find all the image urls in the issue body
  // they are in the format ![image](url1) ![image](url2)
  const regex = /!\[image\]\((.*?)\)/g;
  const imageUrls = issueBody?.match(regex) ?? [];
  if (!imageUrls?.length) {
    return existingImages;
  }

  // the repoSettings.directories.staticAssets is the root directory, if that isn't set then use /public
  const staticFolder = repoSettings?.directories?.staticAssets ?? "public";
  const staticFolderPath = path.join(rootPath, staticFolder, "images");

  // check if the directory exists, if not create it
  try {
    await fsPromises.access(staticFolderPath);
  } catch (error) {
    await fsPromises.mkdir(staticFolderPath, { recursive: true });
  }

  // get the image names from the urls
  const imageNames = imageUrls.map(
    (url) => url.split("/").pop()?.split("?")[0],
  );

  // loop through the images. If the image is not in the existing images,
  // download it to the repoSettings.directories.staticAssets / images directory.
  // Use /public/images if the static assets directory is not set.
  for (const imageName of imageNames) {
    if (!existingImages.includes(imageName!)) {
      const image = imageUrls.find((url) => url.includes(imageName!));
      if (image) {
        const imageUrl = image.split("(")[1]?.split(")")[0];

        if (!imageUrl) {
          continue;
        }

        // Download the image data
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        const imagePath = path.join(staticFolderPath, imageName!);

        // write the image file
        await fsPromises.writeFile(imagePath, imageBuffer);

        // add the image to the existing image string. Note that existingImages is in a string format
        // that is used in the issue body, not an array.
        existingImages += imagePath + "\n\t";
      }
    }
  }
  return existingImages;
};
