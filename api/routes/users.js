const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const User = require("../models/users");
const RefreshTokenModel = require("../models/RefreshTokens/index");
const {
  generateToken,
  generateRefreshToken,
  decodeToken,
} = require("../../auth");
var bcrypt = require("bcryptjs");

var salt = bcrypt.genSaltSync(10);

router.get("/", (req, res, next) => {
  User.find()
    .exec()
    .then((docs) => {
      const response = {
        count: docs.length,
        users: docs.map((doc) => {
          return {
            id: doc._id,
            email: doc.email,
            username: doc.username,
            role: doc.role,
          };
        }),
      };
      docs.length
        ? res.status(200).json(response)
        : res.status(200).json({ message: "No users exists as yet!" });
    })
    .catch();
});

router.post("/signup", (req, res, next) => {
  const { email, password, username, role } = req.body;
  User.findOne({ email })
    .exec()
    .then((result) => {
      if (result) {
        res.status(409).json({
          message: "User already exsists",
          request: {
            type: "POST",
            description: "Try logging in here.",
            url: "localhost:5000/api/users/signin",
          },
        });
      } else {
        bcrypt.hash(password, salt, function (err, hash) {
          if (err) {
            res.status(500).json({ error: err.message });
            // return reject(err);
          }
          const user = new User({
            _id: mongoose.Types.ObjectId(),
            email,
            username,
            password: hash,
            role: role || "customer",
          });
          user
            .save()
            .then((result) => {
              console.log(result);
              res.status(201).json({
                message: "User successfully created!",
                user: result.email,
              });
            })
            .catch((userSaveError) => {
              res.status(500).json({ error: userSaveError.message });
              //return reject(err);
            });
        });
      }
    });
});

router.post("/signin", (req, res, next) => {
  const { email, password } = req.body;
  User.findOne({ email })
    .exec()
    .then((result) => {
      if (result) {
        bcrypt.compare(
          password,
          result.password,
          async function (err, response) {
            !response &&
              res
                .status(401)
                .json({ message: "Password is incorrect. Please try again." });

            if (err) {
              res.status(500).json({ error: err.message });
              // return reject(err);
            }

            const payload = {
              userId: result._id,
              email: result.email,
              password: result.password,
              username: result.username,
              role: result.role,
            };
            const token = await generateToken(payload);
            const refresh_token = await generateRefreshToken(payload);
            const decodedRefreshToken = await decodeToken(refresh_token, true);
            const { iat, exp } = decodedRefreshToken;
            await RefreshTokenModel.add({
              _id: token,
              refresh_token,
              issue_date: iat * 1000,
              expiry_date: exp * 1000,
            });
            res.status(200).json({
              message: "Successfully logged in",
              token,
            });
          }
        );
      } else {
        res.status(404).json({ message: "User not found" });
      }
    })
    .catch((err) => {
      res.status(500).json({ error: err.message });
      return reject(err);
    });
});

router.delete("/:userId", (req, res) => {
  const _id = req.params.userId;
  User.findByIdAndDelete(_id)
    .exec()
    .then((result) => {
      console.log(result);
      !result && res.status(409).json({ message: "User does not exist" });
      result && res.status(200).json({ message: "User deleted" });
    })
    .catch((err) => {
      res.status(500).json({ message: err.message });
      return reject(err);
    });
});

router.put("/:userId", (req, res) => {
  const { newPassword, currentPassword } = req.body;
  const { userId } = req.params;
  // find user by userId
  User.findById(userId)
    .exec()
    .then((result) => {
      // compare current password with the one in the db
      bcrypt.compare(
        currentPassword,
        result.password,
        function (err, response) {
          if (err) {
            res.status(500).json({ message: err.message });
            // return reject(err);
          }
          // if they match, hash the new password and update the user
          if (response) {
            bcrypt.hash(newPassword, salt).then((hash) => {
              User.findByIdAndUpdate(userId, { password: hash })
                .exec()
                .then((result) => {
                  res.status(200).json({ message: "Password updated" });
                })
                .catch((err) => {
                  res.status(500).json({ message: err.message });
                  return reject(err);
                });
            });
          } else {
            res.status(401).json({ message: "Password is incorrect" });
          }
        }
      );
    })
    .catch((err) => {
      res.status(500).json({ message: err.message });
      return reject(err);
    });
});

module.exports = router;
