import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        //const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        //cb(null, file.fieldname + "-" + uniqueSuffix); this will generate a unique filename for each uploaded file
        
        cb(null, file.originalname); // this will keep the original filename of the uploaded file
    },
});

export const upload = multer({ 
    storage: storage 
});
