const mongoose = require('mongoose');

const refreshTokenSchema = mongoose.Schema({
    _id: {type: String, required: true},
    refresh_token: {type: String, required: true},
    is_used: {type: Boolean, required: true, default: false},
    is_revoked: {type: Boolean, required: true, default: false},
    issue_date: {type: Date, required: true},
    expiry_date: {type: Date, required: true},
})

module.exports = mongoose.model('RefreshTokenModel', refreshTokenSchema);