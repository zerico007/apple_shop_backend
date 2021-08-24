const express = require("express");
const httpStatus = require("http-status-codes");
const mongoose = require("mongoose");
const Cart = require("../models/cart");
const Product = require("../models/products");
const { validationMiddleware } = require("../../auth");

const { StatusCodes } = httpStatus;

const router = express.Router();

router.use(validationMiddleware);

router.post("/", async (req, res) => {
  const { product, quantity } = req.body;
  const { userId } = req.authInfo;
  try {
    const existingProduct = await Product.findById(product);
    if (!existingProduct) {
      return res.status(StatusCodes.BAD_REQUEST);
    }
    const newCartItem = { product, quantity };
    const existingCustomerCart = await Cart.findOne({ userId });
    console.log(existingCustomerCart);
    if (existingCustomerCart) {
      const existingCartItems = existingCustomerCart.items;
      existingCartItems.push(newCartItem);

      Cart.findOneAndUpdate(
        { userId },
        { items: existingCartItems },
        { new: true },
        (error, document) => {
          if (error)
            return res
              .status(StatusCodes.INTERNAL_SERVER_ERROR)
              .json({ message: "Unable to udpdate cart" });
          return res.status(StatusCodes.OK).send(document);
        }
      );
    } else {
      const newCustomerCart = new Cart({
        userId,
        items: [newCartItem],
      });
      newCustomerCart.save(async (error, document) => {
        if (error)
          return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ message: "Unable to udpdate cart" });

        return res.status(StatusCodes.OK).send(document);
      });
    }
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  const { userId } = req.authInfo;
  try {
    const customerCart = await Cart.findOne({ userId })
      .populate({
        path: "items",
        populate: {
          path: "product",
          model: "Product",
        },
      })

      .populate("userId");
    const result = {
      user: customerCart.userId.username,
      items: customerCart.items,
    };
    res.status(StatusCodes.OK).send(result);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
});

module.exports = router;
