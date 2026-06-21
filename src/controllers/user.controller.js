import {asyncHandler} from "../utils/asysncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
    res.status(500).json({
        message: "User registered successfully"
    });
});

export {registerUser};