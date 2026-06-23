import {asyncHandler} from "../utils/asysncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
     //get user details form frontend (postman bata line milxa)
     //validation like email is in correct format or not - not empty
     //check if user already exists: from username,email
     //check for images , check for avatar
     //upload then to cloudinary 
     //creat user object - create entry in db
     //remove password and refresh token field form response
     //check for user creation
     //return response 

     const {fullName, email, password} = req.body;

     //to check if any of the fields are empty or not
     console.log("email:", email);
      if (
        [fullName, email, password].some((field) => field?.trim() === "")
      ) {
        throw new ApiError(400, "All fields are required");
      }

      const existedUser = User.findOne({
        $or: [{ email }, { fullName }],
      });
      if(existedUser) {
        throw new ApiError(409, "User already exists");
      }
    
      const avatarLocalPath = req.files?.avatar[0]?.path;
      const coverImageLocalPath = req.files?.coverImage[0]?.path;

      if(!avatarLocalPath)
      {
        throw new ApiError(400,"Avatar file is required")
      }
      const avatar = await uploadOnCloudinary(avatar)
      const coverImage = await uploadOnCloudinary(coverImageLocalPath)
      
      if(!avatar){
        throw new ApiError(400,"Avatar file is required")
      }

      const user =await User.create({
        fullName,
        avatar: avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.tolowercase()
      })

      const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
      )
      if (!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
      }

      return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
      )
});
export {registerUser};

