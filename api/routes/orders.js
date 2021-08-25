const express = require("express");
const moment = require("moment");
const httpStatus = require("http-status-codes");
const Order = require("../models/orders");
const { Cart } = require("../models/cart");
const Product = require("../models/products");
const { validationMiddleware } = require("../../auth");

const { StatusCodes } = httpStatus;

const router = express.Router();

router.use(validationMiddleware);

router.get("/admin", (req, res) => {
  Order.find()
    .populate({
      path: "items",
      populate: {
        path: "product",
        model: "Product",
      },
    })
    .populate("userId")
    .exec()
    .then((docs) => {
      const response = {
        count: docs.length,
        orders: docs.map((doc) => {
          const items = doc.items.map((item) => ({
            quantity: item.quantity,
            product: item.product.name,
            productId: item.product._id,
            productImage: item.product.productImage,
            unitPrice: item.product.price,
            total: item.quantity * item.product.price,
          }));
          return {
            order: {
              items,
              id: doc._id,
              user: doc.userId.username,
              dateCreated: doc.dateCreated,
              OrderTotal: `$${new Intl.NumberFormat({}).format(
                items.reduce((acc, item) => acc + item.total, 0)
              )}.00`,
            },
            request: {
              type: "GET",
              description: "View order details.",
              url: `http://localhost:5000/api/orders/${doc._id}`,
            },
          };
        }),
      };
      docs.length
        ? res.status(200).json(response)
        : res.status(200).json({
            message: "No orders exists as yet. Create our first one!",
          });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err.message });
    });
});

router.get("/", (req, res, next) => {
  const { userId } = req.authInfo;
  Order.find({ userId })
    .populate({
      path: "items",
      populate: {
        path: "product",
        model: "Product",
      },
    })
    .populate("userId")
    .exec()
    .then((docs) => {
      const response = {
        count: docs.length,
        orders: docs.map((doc) => {
          const items = doc.items.map((item) => ({
            quantity: item.quantity,
            product: item.product.name,
            productImage: item.product.productImage,
            productId: item.product._id,
            unitPrice: item.product.price,
            total: item.quantity * item.product.price,
          }));
          return {
            order: {
              items,
              id: doc._id,
              user: doc.userId.username,
              dateCreated: doc.dateCreated,
              OrderTotal: `$${new Intl.NumberFormat({}).format(
                items.reduce((acc, item) => acc + item.total, 0)
              )}.00`,
            },
            request: {
              type: "GET",
              description: "View order details.",
              url: `http://localhost:5000/api/orders/${doc._id}`,
            },
          };
        }),
      };
      docs.length
        ? res.status(200).json(response)
        : res.status(200).json({
            message: "No orders exists as yet. Create our first one!",
          });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err.message });
    });
});

router.post("/", async (req, res) => {
  const { userId } = req.authInfo;
  try {
    const customerCart = await Cart.findOne({ userId });
    if (!customerCart || !customerCart.items.length)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "No items in cart" });

    const newOrder = new Order({
      items: customerCart.items,
      userId,
      dateCreated: moment().format("MMMM Do YYYY, h:mm:ss a"),
    });
    newOrder.save(async (error, document) => {
      if (error)
        return res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ message: "Unable to save order" });
      Cart.updateOne({ userId }, { items: [] }, { new: true }).then((cart) =>
        console.log("cart emptied")
      );
      return res.status(StatusCodes.OK).send(document);
    });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
});

router.delete("/delete", (req, res) => {
  const { productId } = req.body;
  Order.deleteMany({ product: productId })
    .exec()
    .then((response) => {
      res.status(200).json(response);
      console.log(response);
    })
    .catch((err) => {
      res.status(500).json({ message: err.message });
    });
});

router.get("/:orderId", (req, res, next) => {
  const id = req.params.orderId;
  Order.findById(id)
    .populate({
      path: "items",
      populate: {
        path: "product",
        model: "Product",
      },
    })
    .populate("userId")
    .exec()
    .then((doc) => {
      if (doc) {
        const items = doc.items.map((item) => ({
          quantity: item.quantity,
          product: item.product.name,
          productImage: item.product.productImage,
          unitPrice: item.product.price,
          total: item.quantity * item.product.price,
        }));
        res.status(200).json({
          order: {
            items,
            id: doc._id,
            user: doc.userId.username,
            OrderTotal: `$${new Intl.NumberFormat({}).format(
              items.reduce((acc, item) => acc + item.total, 0)
            )}.00`,
          },
        });
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    })
    .catch((err) => {
      res.status(500).json({
        error: err.message,
      });
      //return reject(err);
    });
});

router.delete("/:orderId", (req, res, next) => {
  const { orderId } = req.params;
  const { userId } = req.authInfo;
  Order.findById({ _id: orderId })
    .exec()
    .then((order) => {
      if (order.userId !== userId) {
        return res.status(403).json({
          message: "You do not have permission to deleted this order",
        });
      } else {
        Order.findByIdAndDelete({ orderId })
          .exec()
          .then((result) => {
            res.status(200).json({
              message: `Order ${req.params.orderId} deleted`,
            });
          });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err.message });
      //return reject(err);
    });
});

module.exports = router;
