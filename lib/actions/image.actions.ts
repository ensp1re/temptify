"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { connectToDatabase } from "../database/mongoose";
import { handleError } from "../utils";
import User from "../database/models/user.model";
import Image from "../database/models/image.model";
import { redirect } from "next/navigation";
import { v2 as cloudinary } from "cloudinary";

//  add author to get image
const populateUser = async (query: any) =>
  query.populate({
    path: "author",
    model: User,
    select: "_id firstName lastName email clerkId",
  });

//  add image

export const addImage = async ({ image, userId, path }: AddImageParams) => {
  try {
    await connectToDatabase();

    const author = await User.findById(userId);

    if (!author) {
      throw new Error("Author not found");
    }

    console.log(image.secureURL);

    const newImage = await Image.create({
      ...image,
      author: author._id,
    });

    revalidatePath(path);

    return JSON.parse(JSON.stringify(newImage));
  } catch (error) {
    console.log("addImage -> error", error);
    handleError(error);
  }
};
export const updateImage = async ({
  image,
  userId,
  path,
}: UpdateImageParams) => {
  try {
    await connectToDatabase();

    const imageToUpdate = await Image.findById(image._id);

    if (!imageToUpdate) {
      throw new Error("Image not found");
    }

    if (!imageToUpdate.author.equals(userId)) {
      throw new Error("Unauthorized");
    }

    const updatedImage = await Image.findByIdAndUpdate(
      image._id,
      { ...image },
      { new: true }
    );

    revalidatePath(path);

    return JSON.parse(JSON.stringify(updatedImage));
  } catch (error) {
    console.log("updateImage -> error", error);
    handleError(error);
  }
};
export const deleteImage = async (imageId: string) => {
  try {
    await connectToDatabase();
    await Image.findByIdAndDelete(imageId);
  } catch (error) {
    console.log("deleteImage -> error", error);
    handleError(error);
  } finally {
    redirect("/");
  }
};
export const getImageById = async (imageId: string) => {
  try {
    await connectToDatabase();

    const image = await populateUser(Image.findById(imageId));


    if (!image) {
      throw new Error("Image not found");
    }

    return JSON.parse(JSON.stringify(image));
  } catch (error) {
    console.log("getImageById -> error", error);
    handleError(error);
  }
};

interface GetImagesParams {
  limit?: number;
  page: number;
  searchQuery?: string;
}

export const getAllImages = async ({
  limit = 9,
  page = 1,
  searchQuery = "",
}: GetImagesParams) => {
  try {
    await connectToDatabase();

    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    let expression = "folder=temptify";

    if (searchQuery) {
      expression += ` AND ${searchQuery}`;
    }

    const { resources } = await cloudinary.search
      .expression(expression)
      .execute();

    const resourceIds = resources.map((resource: any) => resource.public_id);

    let query = {};

    if (searchQuery) {
      query = {
        publicId: {
          $in: resourceIds,
        },
      };
    }

    const skipAmount = (Number(page) - 1) * limit;

    const imagesQuery = Image.find(query);
    const populatedImages = await populateUser(imagesQuery); // Wait for the promise to resolve
    const images = populatedImages
      .sort((a: any, b: any) => b.updatedAt - a.updatedAt) // Sort manually if necessary
      .slice(skipAmount, skipAmount + limit); // Use slice for pagination

    const totalImages = await Image.find(query).countDocuments();
    const savedImages = await Image.find().countDocuments();

    return {
      data: JSON.parse(JSON.stringify(images)),
      totalPage: Math.ceil(totalImages / limit),
      savedImages,
    };
  } catch (error) {
    console.log("getAllImages -> error", error);
    handleError(error);
  }
};


export async function getUserImages({
  limit = 9,
  page = 1,
  userId,
}: {
  limit?: number;
  page: number;
  userId: string;
}) {
  try {
    await connectToDatabase();

    const skipAmount = (Number(page) - 1) * limit;

    const imagesQuery = Image.find({ author: userId });
    const populatedImages = await populateUser(imagesQuery); // Wait for the promise to resolve
    const images = populatedImages
      .sort((a: any, b: any) => b.updatedAt - a.updatedAt) // Sort manually if necessary
      .slice(skipAmount, skipAmount + limit); // Use slice for pagination

    const totalImages = await Image.find({ author: userId }).countDocuments();

    return {
      data: JSON.parse(JSON.stringify(images)),
      totalPages: Math.ceil(totalImages / limit),
    };
  } catch (error) {
    handleError(error);
  }
}