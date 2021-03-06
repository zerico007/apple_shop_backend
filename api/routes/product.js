const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const router = express.Router();
const {validationMiddleware} = require('../../auth');
const { updateOne } = require('../models/products');
const Product = require('../models/products');


const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, './uploads/');
    },
    filename: function(req, file, cb){
        cb(null, new Date().toISOString() + file.originalname);
    }
})

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'){
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({storage, 
                        limits: {fileSize: 1024 * 1024 * 5},
                        fileFilter});

router.use(validationMiddleware);
                        
router.get('/', (req, res, next) => {
    Product.find()
    .select('name price productImage videoURL available')
    .exec()
    .then(docs => {
        const response = {
            count: docs.length,
            products: docs.map(doc => {
                return {
                    id: doc._id,
                    name: doc.name,
                    price: doc.price,
                    productImage: doc.productImage,
                    videoURL: doc.videoURL,
                    available: doc.available,
                    request: {
                        type: 'GET',
                        url: `http://localhost:5000/api/products/${doc._id}`
                    }
                }
            }),

        }
        docs.length ? res.status(200).json(response) 
        : res.status(200).json({message : 'No products exists as yet. Create our first one!'});
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error : err.message});
        //return reject(error);
    });
});

router.post('/', upload.single('productImage'), (req, res, next) => {
    console.log(req.file);
    const product = new Product({
        _id: new mongoose.Types.ObjectId(),
        name: req.body.name,
        price: req.body.price,
        videoURL: req.body.videoURL,
        productImage: req.file.path,
    });
    product.save()
    .then(result => {
        res.status(201).json({
            message: 'Product created successfully',
            createdProduct: {
                name: result.name,
                price: result.price,
                id: result._id,
                productImage: result.productImage,
                videoURL: result.videoURL,
                request: {
                    type: 'GET',
                    url: `http://localhost:5000/api/products/${result._id}`
                }
            }
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err.message
        });
        //return reject(err);
    });
});

router.get('/:productId', (req, res, next) => {
    const id = req.params.productId;
    Product.findById(id)
    .select('name price productImage')
    .exec()
    .then(doc => {
        if(doc) {
            res.status(200).json({Product: doc})
        } else {
            res.status(404).json({
                message: 'Product not found'
            })
        }
    })
    .catch(err => {
        res.status(500).json({
            error: err.message
        });
        //return reject(err);
    });
});

router.delete('/:productId', (req, res, next) => {
    Product.remove({_id: req.params.productId}).exec()
    .then(result => {
        res.status(200).json({
            message: `Product ${req.params.productId} deleted`,
            request: {
                type: 'POST',
                description: 'Create new products',
                url: `http://localhost:5000/api/products/`,
                body: {name: 'String', price: 'Number', productImage: 'image/jpeg or image/png'}
            }
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err.message});
        //return reject(err);
    });
    
});

router.put('/:productId', upload.single('productImage'), (req, res, next) => {
    const id = req.params.productId;
    const newName = req.body.newName;
    const newPrice = req.body.newPrice;
    const productImage = req.file?.path;
    console.log(req.body);
    const update = productImage && {productImage} || newName && newPrice && {name: newName, price: newPrice} || newPrice && {price: newPrice} || newName && {name: newName};
    Product.updateOne({_id: id}, update)
    .exec()
    .then(result => {
        console.log({result});
        result.nModified && res.status(200).json({
            message: `Product ${req.params.productId} updated successfully`,
            request: {
                type: 'GET',
                url: `http://localhost:5000/api/products/${id}`
            }
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error: err.message});
       // return reject(err);
    });
    
});

router.put('/:id/unavailable', (req, res) => {
    const _id = req.params.id;
    const { update } = req.body;
    Product.findByIdAndUpdate({_id}, {available: false}).exec()
    .then(result => {
        console.log(result);
        res.status(204).send(result);
    }).catch(err => {
        console.log(err.message);
        res.status(500).send(err.message);
    })
})

router.put('/:id/available', (req, res) => {
    const _id = req.params.id;
    const { update } = req.body;
    Product.findByIdAndUpdate({_id}, {available: true}).exec()
    .then(result => {
        console.log(result);
        res.status(204).send(result);
    }).catch(err => {
        console.log(err.message);
        res.status(500).send(err.message);
    })
})

module.exports = router;