import Product from "../models/Product.js";
import Order from "../models/Order.js";
import stripe from "stripe";

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
