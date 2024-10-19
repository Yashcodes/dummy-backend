const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("Hello Express...!");
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { products, userId } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: products.map((product) => ({
        price_data: {
          currency: "inr",
          product_data: {
            name: product.name,
          },
          unit_amount: product.price * 100,
        },
        quantity: product.quantity,
      })),
      mode: "payment",
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
      metadata: {
        userId: userId,
        products: JSON.stringify(products),
      },
    });

    res.status(200).json({
      success: true,
      message: "Session created successfully",
      id: session.id,
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const event = req.body;

    console.log("Webhook event received:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const products = JSON.parse(session.metadata.products);

        // const order = new Order({
        //   userId,
        //   products,
        //   paymentId: session.id,
        //   paymentStatus: session.payment_status,
        // });

        // await order.save();
        console.log(
          "Order completed:",
          userId,
          products,
          session.id,
          session.payment_status
        );
        break;
      }

      case "checkout.session.payment_failed": {
        const session = event.data.object;
        const userId = session.metadata.userId;

        console.log(
          "Payment failed:",
          userId,
          session.id,
          session.payment_status
        );
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).send("Webhook received");
  }
);

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
