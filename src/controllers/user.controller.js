import {asyncHandler} from "../utils/asysncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefereshToken = async (userId) => {
  try{
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave: false});

    return {accessToken, refreshToken};

  }
  catch(error){
    throw new ApiError(500,error.message)
  }
}


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

     const {fullName, email, password, username} = req.body;

     //to check if any of the fields are empty or not
     //console.log("email:", email);
      if (
        [fullName, email, password].some((field) => field?.trim() === "")
      ) {
        throw new ApiError(400, "All fields are required");
      }

      const existedUser = await User.findOne({
        $or: [{ email }, { fullName }],
      });
      if(existedUser) {
        throw new ApiError(409, "User already exists");
      }
    
      const avatarLocalPath = req.files?.avatar[0]?.path;
      // const coverImageLocalPath = req.files?.coverImage[0]?.path;

      let coverImageLocalPath;

      // Check if coverImage is provided and is an array with at least one file
      if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
      }

      if(!avatarLocalPath)
      {
        throw new ApiError(400,"Avatar path is required")
      }

      const avatar = await uploadOnCloudinary(avatarLocalPath)
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
        username : username.toLowerCase()
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

const loginUser = asyncHandler(async (req, res) => {
      //req body -> data
      // username or email
      //find the user
      //password check
      //access and refresh token  
      //send cookie

      const {email ,username, password} = req.body;
       
      // (!username || !email) this code is invalid
      if (!(username || email)){
        throw new ApiError(400,"Username or email is required");
      }
      const user = await User.findOne({$or: [{email}, {username}]});

      if (!user){
        throw new ApiError(404,"User not found");
      }
      const isPasswordValid = await user.isPasswordCorrect(password);

      if (!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials");
      }
      const {accessToken, refreshToken} = await generateAccessAndRefereshToken(user._id);

      const loggedUser = await User.findById(user._id).select("-password -refreshToken");

      const options = {
        httpOnly: true,
        secure: true
      }
      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(200, { user: loggedUser, accessToken, refreshToken },
           "User logged in successfully")
      );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )
  const options = {
        httpOnly: true,
        secure: true
      }
      return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged Out"))
  
});

const refreshAccessToken = asyncHandler(async(req,res)=>{
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken){
    throw new ApiError(401,"unauthorized access")
  }

  try {
    const decodedToken= jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
    const user= await User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401,"Invalid refresh token")
    }
  
    if (incomingRefreshToken !== user?.refreshToken){
      throw new ApiError(401,"Refresh token is expired or used")
    }
  
    const options ={
      httpOnly: true,
      secure: true
    }
    const {accessToken, newRefreshToken}= await generateAccessAndRefereshToken(user._id)
  
    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {accessToken, refreshToken: newRefreshToken},
        "Access token refreshed"
      )
    )
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh token  catched")
    
  }
})

const changeCurrentPassword = asyncHandler(async (req,res) => {

  const {oldPassword,newPassword}=req.body;
  const user= await User.FindById(req.user?._id) //await halis

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  
  if(!isPasswordCorrect)
  {
    throw new ApiError(400,"Invalid old passsword")
  }

  user.password=newPassword;
  await user.save({validateBeforeSave:False})
  return res
  .status(200)
  .json(new ApiResponse(200,{},"Passwrod changed successfully"));
  
})

const getCurrentUser = asyncHandler(async (req,res) => {
  return res
  .status(200)
  .json(200,req,user,"current user fetched successfully")

  
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
  const {fullName, email}=req.body

  if(!(fullName||email))
  {
    throw new ApiError(400,"All field are required")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set:{
        fullName:fullName,
        email:email
      }
    },
    {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200,user,"Account details updated successfully"))
})


const updateUserAvatar = asyncHandler(async (req,res) => {
  
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath)
  {
    throw new ApiError(400,"Avatar file is missing")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(400,"Error while uploading on avatar")
  }

  const user=await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar : avatar.url
      }
    },
    {new: true}
  ).select("-password")

.status(200)
.json(new ApiResponse(200,user,"Avatr updated successfully"))
  
})

const updateUserCoverImage = asyncHandler(async (req,res) => {
  
  const coverImageLocalPath = req.file?.path

  if(!coverImageLocalPath)
  {
    throw new ApiError(400,"CoverImage file is missing")
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!CoverImage.url){
    throw new ApiError(400,"Error while uploading on avatar")
  }

  const user =await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        coverImage : coverImage.url
      }
    },
    {new: true}
  ).select("-password")
  return res
  .status(200)
  .json(new ApiResponse(200,user,"Cover Image updated successfully"))
  
})


const getUserChannelProfile = asyncHandler(async (req,res) => {
  const {username} =req.params

  if(!username){
    throw new ApiError(400,"Username is required")
  }
  const channel = await User.aggregate([
    {
      $match:{
        username: username?.toLowerCase()
      }
    },
    {
      $lookup:{
        from: "subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscribers"

      }
    },
    {
      $lookup:{
        from: "subscriptions",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
    }
  },
    {
      $addFields:{
        subscriberCount: {
          $size: "$subscribers"
        },
        channelsSubscribedToCount:{
          $size:"$subscribedTo"
        },
        isSubscribed:{
          $cond: {
            if:{$in: [req.user?.id,"subscribers.subscriber"]},
            then: true,
            else: false
          }
        }
      }

    },
    {
      $project:{
        fullName:1,
        username:1,
        subscriberCount:1,
        channelsSubscribedToCount:1,
        avatar:1,
        coverImage:1,
        email:1
      }
    }
  ])
//console.log(channel) to see what channel return

if(!channel?.length){
  throw new ApiError(404,"channeldoesnot exist")
}

return res
.status(200)
.json(
  new ApiResponse(200, channel[0],"User channel fetched successfully")
)
})

const getWatchHistory = asyncHandler(async (req,res) => {
  const user = await User.aggregate([
    {
      $match:{
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup:{
        from:"videos",
        localFiles:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",
        pipeline:[
          {
            $lookup:{
              from: "users",
              localFields:"owner",
              foreignField:"_id",
              as: "owner",
              pipeline:[
                {
                  $project:{
                    fullName:1,
                    username:1,
                    avatar:1
                  }
                }
              ]
            }
          },
          {
            $addFields:{
              owner:{
                $first: "owner"
              }
              
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json(
    new ApiResponse(200,user[0].watchHistory,"Watch history fetched successfully")
  )


})



export {registerUser, loginUser, logoutUser,
   changeCurrentPassword, getCurrentUser, 
   updateAccountDetails, updateUserAvatar, updateUserCoverImage,
  getUserChannelProfile, getWatchHistory};

  

