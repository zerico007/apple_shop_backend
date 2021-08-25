const mongoose = require("mongoose");
const { cartItemSchema } = require("./cart");

const orderSchema = mongoose.Schema({
  items: [cartItemSchema],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  dateCreated: { type: String, timestamp: true },
});

module.exports = mongoose.model("Order", orderSchema);
