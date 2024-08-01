const mongoose = require('mongoose');
const orderModel = require('../models/orderModel');
const productModel = require('../models/productModel');

// Create Order - /api/v1/order 
exports.createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cartItems = req.body;
    const amount = Number(cartItems.reduce((acc, item) => (acc + item.product.price * item.qty), 0)).toFixed(2);
    const status = 'pending';
    const order = await orderModel.create([{ cartItems, amount, status }], { session });

    // Updating product stock
    for (const item of cartItems) {
      const product = await productModel.findById(item.product._id).session(session);
      if (!product) {
        throw new Error(`Product not found: ${item.product._id}`);
      }
      product.stock = product.stock - item.qty;
      await product.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      order
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};
