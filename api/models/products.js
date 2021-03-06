const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    name: {type: String, required: true},
    videoURL: {type: String, required: true},
    available: {type: Boolean, required: true, default: true},
    price: {type: Number, required: true},
    productImage: String
});

module.exports = mongoose.model('Product', productSchema);

