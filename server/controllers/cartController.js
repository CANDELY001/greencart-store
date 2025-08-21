import User from "../models/User.js";

//Update user cartdata: /api/cart/update
export const updateCart = async (req, res) => {
  try {
    // Use authenticated user from req.user (set by authUser middleware)
    const user = req.user;
    const { cartItems } = req.body;
    if (!user) {
      return res.json({
        success: false,
        message: "Not authenticated Please log in",
      });
    }
    user.cartItems = cartItems || {};
    await user.save();
    res.json({
      success: true,
      message: "Cart updated successfully",
      cartItems: user.cartItems,
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: error.message,
    });
  }
};
