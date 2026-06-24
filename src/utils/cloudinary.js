import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import { v2 as cloudinary } from 'cloudinary';
import {ApiError} from "../utils/ApiError.js";
import fs from "fs";
 cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

const uploadOnCloudinary = async (filePath) => {
    try {
        if(!filePath) {
            return null; // Return null if no file path is provided
        }

        const response = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto",
        });
        console.log("File is uploaded successfully");
        fs.unlinkSync(filePath); // Delete the file after successful upload
        return response;
        
    } catch (error) {
        fs.unlinkSync(filePath); // Delete the file if upload fails
        throw new ApiError(500, error.message);
        return null;

    }
};

export {uploadOnCloudinary};