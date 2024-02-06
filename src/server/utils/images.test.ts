import { saveImages } from "../utils/images";
import { describe, it, expect, vi } from "vitest";
import fs from "fs";

describe("saveImages function", () => {
  const rootPath = "/root/path";
  const existingImages = "Images: /root/path/images/existingImage1.jpg\n";
  const s3BaseUrl = "https://bucket.s3.us-west-2.amazonaws.com/uploads/";
  const signature = "?AWSAccessKeyId=ABC&Expires=123&Signature=CBA";
  vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});

  it("returns existing images if no images are found in the issue body", () => {
    const issueBody = "This is a test issue with no images.";
    const result = saveImages(existingImages, issueBody, rootPath);
    expect(result).toBe(existingImages);
  });

  it("adds new images from the issue body to the existing images", () => {
    const image1 = `${s3BaseUrl}image1.jpg${signature}`;
    const image2 = `${s3BaseUrl}image2.jpg${signature}`;
    const issueBody = `This is a test issue with images. ![image](${image1}) ![image](${image2})`;
    const result = saveImages(existingImages, issueBody, rootPath);
    expect(result).toContain("image1.jpg");
    expect(result).toContain("image2.jpg");
    expect(result).toContain("/root/path/public/images/image1.jpg");
  });

  it("does not add duplicate images", () => {
    const image1 = `${s3BaseUrl}existingImage1.jpg${signature}`;
    const issueBody = `This is a test issue with images. ![image](${image1})`;
    const result = saveImages(existingImages, issueBody, rootPath);
    expect(result).toBe(existingImages);
  });

  it("saves images to the correct directory", () => {
    const image1 = `${s3BaseUrl}image1.jpg${signature}`;
    const issueBody = `This is a test issue with images. ![image](${image1})`;
    const repoSettings = { directories: { staticAssets: "static" } };
    const result = saveImages(
      existingImages,
      issueBody,
      rootPath,
      repoSettings,
    );
    expect(result).toContain("/root/path/static/images/image1.jpg");
  });
});
