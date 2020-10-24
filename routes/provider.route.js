// routes/auth.routes.js

const { Router } = require("express");
const router = new Router();
const bcryptjs = require("bcryptjs");
const saltRounds = 10;
const User = require("../models/User.model");
const Session = require("../models/Session.model");
const mongoose = require("mongoose");
const fileUploader = require("../config/cloudinary.config");

////////////////////////////////////////////////////////////////////////
///////////////////////////// SIGNUP //////////////////////////////////
////////////////////////////////////////////////////////////////////////

// .post() route ==> to process form data
router.post("/signup",fileUploader.single("image"), (req, res, next) => {
  const {firstName, lastName, email, password, address, about} = req.body;

  if (!lastName || !email || !password) {
    res.status(200).json({
      errorMessage:
        "All fields are mandatory. Please provide your username, email and password.",
    });
    return;
  }

  // make sure passwords are strong:

  const regex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
  if (!regex.test(password)) {
    res.status(200).json({
      errorMessage:
        "Password needs to have at least 6 chars and must contain at least one number, one lowercase and one uppercase letter.",
    });
    return;
  }

  bcryptjs
    .genSalt(saltRounds)
    .then((salt) => bcryptjs.hash(password, salt))
    .then((hashedPassword) => {
      return User.create({
        // username: username
        firstName,
        lastName,
        email,
        passwordHash: hashedPassword,
        address,
        about,
      });
    })
    .then((user) => {
      Session.create({
        userId: user._id,
        createdAt: Date.now(),
      }).then((session) => {
        res.status(200).json({ accessToken: session._id, user });
      });
    })
    .catch((error) => {
      if (error instanceof mongoose.Error.ValidationError) {
        res.status(200).json({ errorMessage: error.message });
      } else if (error.code === 11000) {
        console.log("error", error);
        res.status(200).json({
          errorMessage:
            "Username and email need to be unique. Either last name or email is already used.",
        });
      } else {
        res.status(500).json({ errorMessage: error });
      }
    }); // close .catch()
});

////////////////////////////////////////////////////////////////////////
///////////////////////////// LOGIN ////////////////////////////////////
////////////////////////////////////////////////////////////////////////

// .post() login route ==> to process form data
router.post("/login", (req, res, next) => {
  const { email, password } = req.body;

  if (email === "" || password === "") {
    res.status(500).json({
      errorMessage: "Please enter both, email and password to login.",
    });
    return;
  }

  User.findOne({ email })
    .then((user) => {
      if (!user) {
        res.status(200).json({
          errorMessage: "Email is not registered. Try with other email.",
        });
        return;
      } else if (bcryptjs.compareSync(password, user.passwordHash)) {
        Session.create({
          userId: user._id,
          createdAt: Date.now(),
        }).then((session) => {
          res.status(200).json({ accessToken: session._id, user });
        });
      } else {
        res.status(200).json({ errorMessage: "Incorrect password." });
      }
    })
    .catch((error) => res.status(500).json({ errorMessage: err }));
});

////////////////////////////////////////////////////////////////////////
///////////////////////////// LOGOUT ////////////////////////////////////
////////////////////////////////////////////////////////////////////////

router.post("/logout", (req, res) => {
  Session.deleteOne({
    userId: req.body.accessToken,
  })
    .then((session) => {
      res.status(200).json({ success: "User was logged out" });
    })
    .catch((error) => res.status(500).json({ errorMessage: error }));
});

router.get("/session/:accessToken", (req, res) => {
  const { accessToken } = req.params;
  Session.findById({ _id: accessToken }).populate("userId").then((session) => {
    if (!session) {
      res.status(200).json({
        errorMessage: "Session does not exist",
      });
    } else {
      res.status(200).json({
        session
      });
    }
  })
  .catch(err => res.status(500).json({errorMessage: err}))
});

module.exports = router;