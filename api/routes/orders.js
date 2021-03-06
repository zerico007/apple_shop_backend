const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');
const Order = require('../models/orders');
const Product = require('../models/products');
const {validationMiddleware} = require('../../auth');
const router = express.Router();

router.use(validationMiddleware);

router.get('/admin', (req, res) => {
    Order.find()
    .select('product quantity dateCreated userId')
    .populate('product')
    .populate('userId')
    .exec()
    .then(docs => {
        const response = {
            count: docs.length,
            orders: docs.map(doc => {
                return {
                    id: doc._id,
                    user: doc.userId.username,
                    product: doc.product.name,
                    quantity: doc.quantity,
                    productImage: doc.product.productImage,
                    dateCreated: doc.dateCreated,
                    unitPrice: `$${new Intl.NumberFormat().format(doc.product.price)}`,
                    Total: `$${new Intl.NumberFormat().format(doc.quantity * (doc.product.price))}`,
                }
            })

        }
        docs.length ? res.status(200).json(response) 
        : res.status(200).json({message : 'No orders exists as yet.'});
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error : err.message});
    });
})

router.get('/', (req, res, next) => {
    const { userId } = req.authInfo;
    Order.find({userId})
    .select('product quantity dateCreated')
    .populate('product')
    .exec()
    .then(docs => {
        const response = {
            count: docs.length,
            orders: docs.map((doc) => {
                return {
                    id: doc._id,
                    product: doc.product.name,
                    quantity: doc.quantity,
                    productImage: doc.product.productImage,
                    dateCreated: doc.dateCreated,
                    unitPrice: `$${new Intl.NumberFormat().format(doc.product.price)}`,
                    Total: `$${new Intl.NumberFormat().format(doc.quantity * (doc.product.price))}`,
                    request: {
                        type: 'GET',
                        description: 'View order details.',
                        url: `http://localhost:5000/api/orders/${doc._id}`
                    }
                };
                
            })
        }
        docs.length ? res.status(200).json(response) 
        : res.status(200).json({message : 'No orders exists as yet. Create our first one!'});
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({error : err.message});
    });
});

router.post('/', (req, res, next) => {
    const {product, quantity} = req.body;
    const {userId} = req.authInfo;
    Product.findById(product).exec().then(result =>{
        if(result){
            const order = new Order({
                _id: mongoose.Types.ObjectId(),
                quantity,
                product,
                userId,
                dateCreated: moment().format('MMMM Do YYYY, h:mm:ss a')
              });
              order.save()
              .then(response => {
                  res.status(201).json({
                      message: "Order successfully created!",
                      createdOrder: {
                          product: response.product,
                          quantity: response.quantity
                      },
                      request: {
                          type: 'GET',
                          description: 'View order details.',
                          url: `http://localhost:5000/api/orders/${response._id}`
                      } 
                  });
              })
              .catch(err => {
                  res.status(500).json({error: err.message});
                  console.log(err);
              })
        } else {
            res.status(404).json({message: 'Product does not exist'})
        }
    })
    .catch(err => {
        res.status(500).json({message: err.message});
        //return reject(err);
    })
});

router.delete('/delete', (req, res) => {
    const { productId } = req.body;
    Order.deleteMany({product: productId}).exec()
    .then(response => {
        res.status(200).json(response);
        console.log(response);
    }).catch(err => {
        res.status(500).json({message: err.message})
    });
})

router.get('/:orderId', (req, res, next) => {
    const id = req.params.orderId;
    Order.findById(id)
    .select('product quantity')
    .populate('product')
    .exec()
    .then(doc => {
        if(doc) {
            res.status(200).json({
                Quantity: doc.quantity,
                product: doc.product.name,
                productImage: doc.product.productImage,
                unitPrice: `$${new Intl.NumberFormat().format(doc.product.price)}`,
                Total: `$${new Intl.NumberFormat().format(doc.quantity * doc.product.price)}`,
                request: {
                    type: "GET",
                    description: 'View the product',
                    url: `http://localhost:5000/api/products/${doc.product._id}`
                }
                })
        } else {
            res.status(404).json({message: 'Order not found'})
        }
        
    })
    .catch(err => {
        res.status(500).json({
            error: err.message
        });
        //return reject(err);
    });
});

router.delete('/:orderId', (req, res, next) => {
    const { orderId } = req.params;
    const { userId } = req.authInfo;
    Order.findById({_id: orderId}).exec().then(order => {
        if (order.userId !== userId) {
            return res.status(403).json({message: "You do not have permission to deleted this order"});
        } else {
            Order.findByIdAndDelete({orderId}).exec()
            .then(result => {
                res.status(200).json({
                    message: `Order ${req.params.orderId} deleted`,
                    request: {
                        type: 'POST',
                        description: 'Create new orders',
                        url: `http://localhost:5000/api/orders/`,
                        body: {quantity: 'Number', product: 'ID String'}
                    }
                });
            })
        }
    }).catch(err => {
        console.log(err);
        res.status(500).json({error: err.message});
        //return reject(err);
    });
});

module.exports = router;