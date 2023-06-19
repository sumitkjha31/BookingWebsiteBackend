const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User.js");
const Place = require("./models/Place.js");
const Booking = require("./models/Booking.js");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const url = require("url");
const imageDownloader = require("image-downloader");
const multer = require("multer");
const fs = require("fs");
const fileUpload = require("express-fileupload");
require("dotenv").config();
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
const cloudinary = require("cloudinary").v2;
// Configuration
// cloudinary.config({
//   cloud_name: "dpmqtgwfu",
//   api_key: "668149654818296",
//   api_secret: "vjuT4Aq3igimg0BUdUvB1T_Dvdo",
// });

// cloudinary.config({ 
//   cloud_name: 'dpmqtgwfu', 
//   api_key: '668149654818296', 
//   api_secret: 'vjuT4Aq3igimg0BUdUvB1T_Dvdo' 
// });


cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// const connection = mongoose.connection;
// Create a GridFSBucket instance using the native MongoDB driver
// let bucket;

// async function init() {
//   try {
//     console.log("-1");
//     await new Promise((resolve) => {
//       console.log("0");
//       console.log(connection.db);
//       connection.once("open", () => {
//         bucket = new mongoose.mongo.GridFSBucket(connection.db, {
//           bucketName: "uploads",
//         });
//         console.log("-5");
//         resolve();
//       });
//     });
//   } catch (error) {
//     console.error(error);
//   }
// }

// // Define a schema for the file model
// const fileSchema = new mongoose.Schema({
//   filename: String,
//   contentType: String,
//   metadata: Object,
//   length: Number,
//   chunkSize: Number,
//   uploadDate: Date,
//   aliases: [String],
//   md5: String,
// });

// const File = mongoose.model("File", fileSchema);

// // Use the File model to upload a file
// const uploadFile = async (filename, stream) => {
//   const uploadStream = bucket.openUploadStream(filename);
//   stream.pipe(uploadStream);
//   return new Promise((resolve, reject) => {
//     uploadStream.on("finish", () => {
//       const file = new File({
//         filename: filename,
//         contentType: uploadStream.contentType,
//         metadata: uploadStream.metadata,
//         length: uploadStream.length,
//         chunkSize: uploadStream.chunkSize,
//         uploadDate: uploadStream.uploadDate,
//         aliases: uploadStream.aliases,
//         md5: uploadStream.md5,
//       });
//       file.save((err) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(file);
//         }
//       });
//     });
//     stream.on("error", (err) => {
//       reject(err);
//     });
//     uploadStream.on("error", (err) => {
//       reject(err);
//     });
//   });
// };

// // Use the File model to download a file
// const downloadFile = async (id, writeStream) => {
//   const downloadStream = bucket.openDownloadStream(id);
//   downloadStream.pipe(writeStream);
//   return new Promise((resolve, reject) => {
//     downloadStream.on("end", () => {
//       resolve();
//     });
//     downloadStream.on("error", (err) => {
//       reject(err);
//     });
//     writeStream.on("error", (err) => {
//       reject(err);
//     });
//   });
// };

const PORT = process.env.PORT || 4000;

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = "fasefraw4r5r3wq45wdfgw34twdfg";

app.use("/uploads", express.static(__dirname + "/uploads"));
// Import the error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Internal server error");
});

app.use(
  cors({
    origin:
      "https://explorehotels.onrender.com",
    credentials: true,
  })
);
app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://explorehotels.onrender.com"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use((req, res, next) => {
  console.log("Request received from:", req.get("origin"));
  next();
});

function getUserDataFromReq(req) {
  return new Promise((resolve, reject) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      resolve(userData);
    });
  });
}

app.get("/test", (req, res) => {
  res.json("test ok");
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });
    res.json(userDoc);
  } catch (e) {
    res.status(422).json(e);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(email);
  const userDoc = await User.findOne({ email });
  if (userDoc) {
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      jwt.sign(
        {
          email: userDoc.email,
          id: userDoc._id,
        },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          console.log("token /login", token);
          res.json({ token, userDoc });
        }
      );
    } else {
      res.status(422).json("pass not ok");
    }
  } else {
    res.json("not found");
  }
});

app.get("/profile", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      const { name, email, _id } = await User.findById(userData.id);
      res.json({ name, email, _id });
    });
  } else {
    res.json(null);
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json(true);
});

app.post("/upload-by-link", async (req, res) => {
  let { link } = req.body;

  let protocolUsed = link.substring(0, 5);
  if (protocolUsed !== "https") {
    link = "https://" + link;
  }

  const options = {
    url: link,
    dest: __dirname + "/uploads/photo.jpg",
  };

  try {
    const { filename } = await imageDownloader.image(options);

    const result = await cloudinary.uploader.upload(filename);
    const secureUrl = result.secure_url;

    res.json(secureUrl);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});
// app.post("/upload-by-link", async (req, res) => {
//   let { link } = req.body;
//   console.log(link);
//   let protocolUsed = link.substring(0, 5);
//   if (protocolUsed !== "https") {
//     link = "https://" + link;
//   }
//   const newName = "photo" + Date.now() + ".jpg";

//   await imageDownloader.image({
//     url: link,
//     dest: __dirname + "/uploads/" + newName,
//   });
//   res.json(newName);
// });

// app.post("/upload-by-link", async (req, res) => {
//   const { link } = req.body;
//   const newName = "photo" + Date.now() + ".jpg";
//   const parsedUrl = url.parse(link);
//   const domainName = parsedUrl.hostname;
//   await imageDownloader.image({
//     url: link,
//     dest: __dirname + "/uploads/" + newName,
//     headers: {
//       Referer: `http://${domainName}/`,
//     },
//   });
//   res.json(newName);
// });
//gr
// const photosMiddleware = multer({ dest: "uploads/" });
// app.post("/upload", photosMiddleware.array("photos", 100), (req, res) => {
//   const uploadedFiles = [];
//   for (let i = 0; i < req.files.length; i++) {
//     const { path, originalname } = req.files[i];
//     const parts = originalname.split(".");
//     const ext = parts[parts.length - 1];
//     const newPath = path + "." + ext;
//     fs.renameSync(path, newPath);
//     uploadedFiles.push(newPath.replace("uploads/", ""));
//   }
//   res.json(uploadedFiles);
// });

const storage = multer.diskStorage({});
const upload = multer({ storage });
app.post("/upload", upload.array("photos", 100), async (req, res) => {
  const uploadedFiles = [];

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];

    const result = await cloudinary.uploader.upload(file.path);
    uploadedFiles.push(result.secure_url);

    fs.unlinkSync(file.path);
  }

  res.json(uploadedFiles);
});
// app.post("/upload-by-link", async (req, res) => {
//   let { link } = req.body;
//   console.log(link);
//   let protocolUsed = link.substring(0, 5);
//   if (protocolUsed !== "https") {
//     link = "https://" + link;
//   }
//   const newName = "photo" + Date.now() + ".jpg";

//   try {
//     // Download the image from the link
//     const { filename, image } = await imageDownloader.image({
//       url: link,
//       dest: __dirname + "/uploads/" + newName,
//     });
//     console.log(image);
//     console.log(filename);
//     init()
//       .then(() => {
//         console.log("2");
//         // use the bucket object here
//         // Create a read stream from the downloaded image
//         const readStream = fs.createReadStream(
//           __dirname + "/uploads/" + newName
//         );
//         console.log("3");
//         // Upload the image to the database
//         const writeStream = bucket.openUploadStream(newName);
//         console.log("4");
//         readStream.pipe(writeStream);
//         console.log("5");
//         // Send the filename of the saved image back to the user
//         res.json(newName);
//       })
//       .catch((error) => {
//         console.error(error);
//       });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Internal Server Error");
//   }
// });
// // Save files from the database to the local uploads folder
// app.get("/save-to-local", async (req, res) => {
//   try {
//     const files = await bucket.find().toArray();

//     files.forEach(async (file) => {
//       const readStream = bucket.openDownloadStream(file._id);
//       const writeStream = fs.createWriteStream(
//         path.join(__dirname, "uploads", file.filename)
//       );
//       readStream.pipe(writeStream);
//       console.log(`File ${file.filename} saved to uploads folder`);
//     });

//     res.send("Files saved to uploads folder");
//   } catch (err) {
//     console.error(err);
//     res.status(500).send("Internal Server Error");
//   }
// });
// Add your routes here
app.post("/places", async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    console.log("token", token);
    const {
      title,
      address,
      addedPhotos,
      description,
      price,
      perks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuests,
    } = req.body;
    const userData = jwt.verify(token, jwtSecret);
    if (!userData || !userData.id) {
      throw new Error("Invalid token");
    }
    const placeDoc = await Place.create({
      owner: userData.id,
      price,
      title,
      address,
      photos: addedPhotos,
      description,
      perks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuests,
    });
    res.json(placeDoc);
  } catch (err) {
    next(err);
  }
});

app.get("/user-places", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    const { id } = userData;
    res.json(await Place.find({ owner: id }));
  });
});

app.get("/places/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await Place.findById(id));
});

app.put("/places", async (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  const {
    id,
    title,
    address,
    addedPhotos,
    description,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
    price,
  } = req.body;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) throw err;
    const placeDoc = await Place.findById(id);
    if (userData.id === placeDoc.owner.toString()) {
      placeDoc.set({
        title,
        address,
        photos: addedPhotos,
        description,
        perks,
        extraInfo,
        checkIn,
        checkOut,
        maxGuests,
        price,
      });
      await placeDoc.save();
      res.json("ok");
    }
  });
});

app.get("/places", async (req, res) => {
  res.json(await Place.find());
});
//hg
app.post("/bookings", async (req, res) => {
  const userData = await getUserDataFromReq(req);
  const { place, checkIn, checkOut, numberOfGuests, name, phone, price } =
    req.body;
  Booking.create({
    place,
    checkIn,
    checkOut,
    numberOfGuests,
    name,
    phone,
    price,
    user: userData.id,
  })
    .then((doc) => {
      res.json(doc);
    })
    .catch((err) => {
      throw err;
    });
});
//
app.get("/bookings", async (req, res) => {
  const userData = await getUserDataFromReq(req);
  res.json(await Booking.find({ user: userData.id }).populate("place"));
});

app.listen(PORT);
