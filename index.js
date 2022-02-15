const express = require("express");
const formidable = require("express-formidable");
const mongoose = require("mongoose");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;

const app = express();
app.use(formidable());

mongoose.connect("mongodb://localhost/vinted");

cloudinary.config({
  cloud_name: "dfwbghnbh",
  api_key: "287349737675552",
  api_secret: "arH5RK41tEnTM6xw79IlbMFd1eA",
});

const Offer = require("./models/Offer");

const User = require("./models/User");
const { all } = require("express/lib/application");

const password = String;

const owner = User;

const salt = uid2(16);
console.log("salt:", salt);

const token = uid2(64);
console.log("token:", token);

const hash = SHA256(password + salt).toString(encBase64);
console.log("hash:", hash);

const isAuthenticated = async (req, res, next) => {
  //sans le next, la requête va rester "bloquée" dans ma fonction isAuthenticated
  //   next();
  console.log(req.headers.authorization);
  if (req.headers.authorization) {
    //je continue la suite de mes vérifications
    const user = await User.findOne({
      token: req.headers.authorization.replace("Bearer ", ""),
    });

    if (user) {
      req.user = user;
      next();
    } else {
      res.status(401).json({ error: "Unautorized 2" });
    }
  } else {
    res.status(401).json({ error: "Unauthorized 1" });
  }
};

app.post("/User/signup", async (req, res) => {
  try {
    const User = await User.findOne({ email: req.fields.email });
    console.log(User);

    if (req.fields.username) {
      if (!User) {
        const newUser = new User({
          email: req.fields.email,
          account: {
            username: req.fields.username,
            phone: req.fields.phone,
            avatar: Object,
          },
          token: token,
          hash: hash,
          salt: salt,
        });
        await newUser.save();
        res.status(200).json(newUser);
      } else {
        res.status(400).json({ message: "User already exists" });
      }
    } else {
      res.status(400).json({ message: "Username required" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/User/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.fields.email });
    if (user === null) {
      res.status(401).json({ message: "Unauthorized ! 1" });
    } else {
      console.log(user.hash, "hash à comparer");
      const newHash = SHA256(req.fields.password + user.salt).toString(
        encBase64
      );
      console.log(newHash, "Mon nouveau hash");
      if (user.hash === newHash) {
        res.json({
          _id: user._id,
          token: user.token,
          account: user.account,
        });
      } else {
        res.status(401).json({ message: "Unauthorized ! 2" });
      }
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    const newOffer = new Offer({
      product_name: req.fields.title,
      product_description: req.fields.description,
      product_price: req.fields.price,
      product_details: [
        {
          condition: req.fields.condition,
        },
        {
          city: req.fields.city,
        },
        {
          brand: req.fields.brand,
        },
        {
          size: req.fields.size,
        },
        {
          color: req.fields.color,
        },
      ],
    });

    const pictureToUpload = req.files.picture.path;

    const result = await cloudinary.uploader.upload(pictureToUpload);

    newOffer.product_image = result;

    newOffer.owner = req.user;

    await newOffer.save();
    res.json(newOffer);
  } catch (error) {
    res.status(400).json(error.message);
  }
});

app.get("/offers"),
  async (req, res) => {
    const filtersObject = {};

    filtersObject.product_name = req.query.title;

    const offers = await Offer.find({ product_name: req.query.title }).select(
      "product _name product_price"
    );
    res.json(offers);
  };

app.all("*", (req, res) => {
  res.status(404).json("Page introuvable");
});

app.listen(3000, () => {
  console.log("Serveur has started !");
});
