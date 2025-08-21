import Product from "../models/Product.js";
import Order from "../models/Order.js";
import stripe from "stripe";
import { response } from "express";
import User from "../models/User.js";

//Place order COD: /api/order/cod
export const placeOrderCOD = async (req, res) => {
  try {
    const { userId, items, address } = req.body;
    if (!address || items.length === 0) {
      return res.json({
        success: false,
        message: "Please provide all required fields",
      });
    }
    //calculate Amount using items
    let amount = await items.reduce(async (acc, item) => {
      const product = await Product.findById(item.product);
      return (await acc) + product.offerPrice * item.quantity;
    }, 0);
    amount += Math.floor(amount * 0.02); //Adding 2% tax
    await Order.create({
      userId,
      items,
      address,
      amount,
      paymentMethod: "COD",
    });
    return res.json({
      success: true,
      message: "Order placed successfully",
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

//Place order Stripe: /api/order/stripe
export const placeOrderStripe = async (req, res) => {
  try {
    const { items, address } = req.body;
    const userId = req.user._id;
    const origin =
      req.headers.origin || process.env.FRONTEND_URL || "http://localhost:3000";
    if (!address || items.length === 0) {
      return res.json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    let productData = [];
    //calculate Amount using items
    let amount = await items.reduce(async (acc, item) => {
      const product = await Product.findById(item.product);
      productData.push({
        name: product.name,
        price: product.offerPrice,
        quantity: item.quantity,
      });
      return (await acc) + product.offerPrice * item.quantity;
    }, 0);
    amount += Math.floor(amount * 0.02); //Adding 2% tax
    const order = await Order.create({
      userId,
      items,
      address,
      amount,
      paymentMethod: "Online",
    });
    // Stripe Gateway Initialization
    const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);
    //create line items for Stripe
    const line_items = productData.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100), // Stripe expects amount in cents
      },
      quantity: item.quantity,
    }));
    //create Stripe session
    const session = await stripeInstance.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader?next=my-orders`,
      cancel_url: `${origin}/cart`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
      },
    });

    return res.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

//Stripe webhook to verify payement Action: /stripe
export const stripeWebhook = async (req, res) => {
  const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
  //Handle the event
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;
      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });
      const { orderId, userId } = session.data[0].metadata;
      //Mark payemnt as paid
      await Order.findByIdAndUpdate(orderId, {
        isPaid: true,
      });
      //Clear user cart items
      await User.findByIdAndUpdate(userId, { cartItems: [] });
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;
      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });
      const { orderId } = session.data[0].metadata;
      await Order.findByIdAndUpdate(orderId);
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
      break;
  }
  res.json({ received: true });
};

//get Orders by User ID: /api/order/user
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id || req.body.userId;
    if (!userId) {
      return res.json({ success: false, message: "User not authenticated" });
    }
    const orders = await Order.find({
      userId,
      $or: [{ paymentMethod: "COD" }, { isPaid: false }],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

//get all Orders: (for seller / admin) /api/order/seller
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ paymentMethod: "COD" }, { isPaid: false }],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
