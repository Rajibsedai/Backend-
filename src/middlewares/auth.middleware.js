import {asyncHandler} from "../utils/asysncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import {User} from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _res, next) => { //_res_> res is not used.
    try {
         const token = req.cookies?.accessToken || req.header
    ("Authorization")?.replace("Bearer ", "")

    if (!token){
        throw new ApiError(401, "Unauthorized request");
    }
    const decodedToken =jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

    if (!user){
        throw new ApiError(401, "Invalid access token");
    }

    req.user = user;
    next();

    
}
catch (error) {
   throw new ApiError(401, error?.message || "Invalid access token");
}
    })