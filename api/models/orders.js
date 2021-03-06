const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    product: {type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    quantity: {type: Number, default: 1},
    dateCreated: {type: String, timestamp: true}
});

module.exports = mongoose.model('Order', orderSchema);
