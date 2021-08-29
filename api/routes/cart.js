const express = require("express");
const httpStatus = require("http-status-codes");
const mongoose = require("mongoose");
const { Cart } = require("../models/cart");
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
    if (existingCustomerCart) {
      const existingCartItems = existingCustomerCart.items;
      const itemAlreadyInCart = existingCartItems.some(
        (item) => item.product == product
      );
      if (itemAlreadyInCart) {
        for (const item of existingCartItems) {
          if (item.product == product) {
            item.quantity = item.quantity + +quantity;
          }
        }
      } else {
        existingCartItems.push(newCartItem);
      }

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
    if (!customerCart || !customerCart.items.length)
      return res.status(StatusCodes.OK).json({ message: "No items in cart" });
    const result = {
      user: customerCart.userId.username,
      items: customerCart.items,
      Total: `$${new Intl.NumberFormat({}).format(
        customerCart.items.reduce(
          (acc, item) => acc + item.quantity * item.product.price,
          0
        )
      )}.00`,
    };
    res.status(StatusCodes.OK).send(result);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
});

router.put("/remove", async (req, res) => {
  const { product } = req.body;
  const { userId } = req.authInfo;
  try {
    const customerCart = await Cart.findOne({ userId });
    if (!customerCart || !customerCart.items.length)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "No items in cart" });
    const updatedCartItems = customerCart.items.filter(
      (item) => item.product != product
    );

    Cart.findOneAndUpdate(
      { userId },
      { items: updatedCartItems },
      { new: true },
      (error, document) => {
        if (error)
          return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json({ message: "Unable to udpdate cart" });
        return res.status(StatusCodes.OK).send(document);
      }
    );
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
});

module.exports = router;
