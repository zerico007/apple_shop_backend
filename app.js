const express = require('express');
const app = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const cors = require('cors');

const productRoutes = require('./api/routes/product');
const orderRoutes = require('./api/routes/orders');
const userRoutes = require('./api/routes/users');

try {
    mongoose.connect(`mongodb+srv://Kabash_admin:dawada1011@cluster0.jf2i8.mongodb.net/apiRestShop?retryWrites=true&w=majority`, 
    { 
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true
    }, () => console.log('connected'));
} catch (err) {
    console.log(error + 'Something went wrong');
}
mongoose.Promise = global.Promise;

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

app.use(cors());
    
// Routes to handle routing requests
app.use('/api/products/', productRoutes);
app.use('/api/orders/', orderRoutes);
app.use('/api/users/', userRoutes);

app.use((req, res, next) => {
    const error = new Error("Not Found");
    error.status = 404;
    next(error);
});

app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

module.exports = app;
