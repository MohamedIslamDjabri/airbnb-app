import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import multer from "multer";
import dotenv from "dotenv";

import User from "./models/User.js";
import Place from "./models/Place.js";
import Booking from "./models/Booking.js";

import cloudinaryPkg from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = process.env.JWT_SECRET;

/* ================= CLOUDINARY ================= */

const cloudinary = cloudinaryPkg.v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "airbnb-clone",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const uploadMiddleware = multer({ storage });

/* ================= DB ================= */

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDB connected");
  } catch (err) {
    console.error(err);
  }
}

connectToDatabase();

/* ================= MIDDLEWARE ================= */

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  })
);

/* ================= AUTH HELPER ================= */

function getUserDataFromReq(req) {
  return new Promise((resolve, reject) => {
    jwt.verify(req.cookies.token, jwtSecret, {}, (err, userData) => {
      if (err) return reject(err);
      resolve(userData);
    });
  });
}

/* ================= AUTH ================= */

app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;

  const userDoc = await User.create({
    name,
    email,
    password: bcrypt.hashSync(password, bcryptSalt),
  });

  res.json(userDoc);
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const userDoc = await User.findOne({ email });
  if (!userDoc) return res.status(422).json("User not found");

  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (!passOk) return res.status(422).json("Wrong password");

  jwt.sign(
    { email: userDoc.email, id: userDoc._id },
    jwtSecret,
    {},
    (err, token) => {
      if (err) throw err;

      res.cookie("token", token, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });

      res.json(userDoc);
    }
  );
});

app.get("/api/profile", async (req, res) => {
  const { token } = req.cookies;
  if (!token) return res.json(null);

  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) return res.json(null);

    const user = await User.findById(userData.id);
    res.json(user);
  });
});

app.post("/api/logout", (req, res) => {
  res.cookie("token", "").json(true);
});

/* ================= UPLOAD ================= */

app.post("/api/upload", uploadMiddleware.array("photos", 100), (req, res) => {
  const urls = req.files.map((file) => file.path);
  res.json(urls);
});

app.post("/api/upload-by-link", async (req, res) => {
  const { link } = req.body;

  const result = await cloudinary.uploader.upload(link, {
    folder: "airbnb-clone",
  });

  res.json(result.secure_url);
});

/* ================= PLACES ================= */

app.post("/api/places", async (req, res) => {
  const userData = await getUserDataFromReq(req);

  const place = await Place.create({
    owner: userData.id,
    ...req.body,
  });

  res.json(place);
});

app.get("/api/places", async (req, res) => {
  res.json(await Place.find());
});

app.get("/api/user-places", async (req, res) => {
  const userData = await getUserDataFromReq(req);

  res.json(await Place.find({ owner: userData.id }));
});

app.get("/api/places/:id", async (req, res) => {
  res.json(await Place.findById(req.params.id));
});

app.put("/api/places", async (req, res) => {
  const userData = await getUserDataFromReq(req);

  const place = await Place.findById(req.body.id);

  if (userData.id === place.owner.toString()) {
    Object.assign(place, req.body);
    await place.save();
    res.json("ok");
  }
});

/* ================= BOOKINGS ================= */

app.post("/api/bookings", async (req, res) => {
  try {
    const userData = await getUserDataFromReq(req);

    const booking = await Booking.create({
      ...req.body,
      user: userData.id,
    });

    res.json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/bookings", async (req, res) => {
  const userData = await getUserDataFromReq(req);

  const bookings = await Booking.find({ user: userData.id }).populate(
    "place"
  );

  res.json(bookings);
});


// ================= START =================

const startServer = async () => {
  try {
    if (process.env.NODE_ENV !== "production") {
      app.listen(PORT, () => {
        console.log("Server started on port:", PORT);
      });
    }
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1); // Exit the process with a failure code
  }
};

startServer();

export default app;