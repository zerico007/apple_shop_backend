const mongoose = require("mongoose");

const cartItemSchema = mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, default: 1 },
});

const cartSchema = mongoose.Schema({
  items: [cartItemSchema],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const Cart = mongoose.model("Cart", cartSchema);

module.exports = { cartItemSchema, Cart };
