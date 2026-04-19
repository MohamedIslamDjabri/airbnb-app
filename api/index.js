const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User.js');
const Place = require('./models/Place.js');
const Booking = require('./models/Booking.js');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;
const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = process.env.JWT_SECRET;

// ✅ Cloudinary
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Multer + Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'airbnb-clone/places',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});
const photosMiddleware = multer({ storage });

// ✅ DB
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
  }
}
connectToDatabase();

// ✅ Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  credentials: true,
  origin: true,
}));

// ✅ Helper
function getUserDataFromReq(req) {
  return new Promise((resolve, reject) => {
    jwt.verify(req.cookies.token, jwtSecret, {}, (err, userData) => {
      if (err) throw err;
      resolve(userData);
    });
  });
}

// ================= AUTH =================

app.post('/api/register', async (req,res) => {
  const {name,email,password} = req.body;

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

app.post('/api/login', async (req,res) => {
  const {email,password} = req.body;
  const userDoc = await User.findOne({email});

  if (!userDoc) {
    return res.status(422).json('User not found');
  }

  const passOk = bcrypt.compareSync(password, userDoc.password);

  if (passOk) {
    jwt.sign({
      email:userDoc.email,
      id:userDoc._id
    }, jwtSecret, {}, (err,token) => {
      if (err) throw err;
      res.cookie('token', token).json(userDoc);
    });
  } else {
    res.status(422).json('Wrong password');
  }
});

app.get('/api/profile', async (req,res) => {
  const {token} = req.cookies;

  if (!token) return res.json(null);

  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) throw err;
    const user = await User.findById(userData.id);
    res.json(user);
  });
});

app.post('/api/logout', (req,res) => {
  res.cookie('token', '').json(true);
});

// ================= UPLOAD =================

// ✅ Upload by link (Cloudinary)
app.post('/api/upload-by-link', async (req,res) => {
  const {link} = req.body;

  const result = await cloudinary.uploader.upload(link, {
    folder: 'airbnb-clone/places',
  });

  res.json(result.secure_url);
});

// ✅ Upload files
app.post('/api/upload', photosMiddleware.array('photos', 100), async (req,res) => {
  const uploadedFiles = [];

  for (let i = 0; i < req.files.length; i++) {
    uploadedFiles.push(req.files[i].path); // Cloudinary URL
  }

  res.json(uploadedFiles);
});

// ================= PLACES =================

app.post('/api/places', async (req,res) => {
  const {token} = req.cookies;

  const {
    title,address,addedPhotos,description,price,
    perks,extraInfo,checkIn,checkOut,maxGuests,
  } = req.body;

  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) throw err;

    const placeDoc = await Place.create({
      owner: userData.id,
      price,
      title,
      address,
      photos: addedPhotos, // ✅ Cloudinary URLs
      description,
      perks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuests,
    });

    res.json(placeDoc);
  });
});

app.get('/api/user-places', async (req,res) => {
  const {token} = req.cookies;

  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    const {id} = userData;
    res.json(await Place.find({owner:id}));
  });
});

app.get('/api/places/:id', async (req,res) => {
  const {id} = req.params;
  res.json(await Place.findById(id));
});

app.put('/api/places', async (req,res) => {
  const {token} = req.cookies;

  const {
    id, title,address,addedPhotos,description,
    perks,extraInfo,checkIn,checkOut,maxGuests,price,
  } = req.body;

  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) throw err;

    const placeDoc = await Place.findById(id);

    if (userData.id === placeDoc.owner.toString()) {
      placeDoc.set({
        title,
        address,
        photos: addedPhotos, // ✅ updated URLs
        description,
        perks,
        extraInfo,
        checkIn,
        checkOut,
        maxGuests,
        price,
      });

      await placeDoc.save();
      res.json('ok');
    }
  });
});

app.get('/api/places', async (req,res) => {
  res.json(await Place.find());
});

// ================= BOOKINGS =================

app.post('/api/bookings', async (req, res) => {
  try {
    const userData = await getUserDataFromReq(req);

    const {
      place,
      checkIn,
      checkOut,
      numberOfGuests,
      name,
      phone,
      price,
    } = req.body;

    const booking = await Booking.create({
      place,
      checkIn,
      checkOut,
      numberOfGuests,
      name,
      phone,
      price,
      user: userData.id,
    });

    res.json(booking);

  } catch (err) {
    console.log('Booking error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/bookings', async (req,res) => {
  const userData = await getUserDataFromReq(req);
  res.json(await Booking.find({user:userData.id}).populate('place'));
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