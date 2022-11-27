const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SK);

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.rmfwbvj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Unauthorized access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(401).send("Unauthorized access");
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const categoriesCollection = client
      .db("BikeTrader")
      .collection("categories");
    const bikesCollection = client.db("BikeTrader").collection("bikes");
    const usersCollection = client.db("BikeTrader").collection("users");
    const bookingsCollection = client.db("BikeTrader").collection("bookings");
    const paymentCollection = client.db("BikeTrader").collection("payment");
    const reportsCollection = client.db("BikeTrader").collection("reports");
    const advertisesCollection = client
      .db("BikeTrader")
      .collection("advertises");
    const blogsCollection = client.db("BikeTrader").collection("blogs");

    async function verifyBuyer(req, res, next) {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user.type !== "Buyer") {
        return res.status(403).send("Forbidden user");
      }
      next();
    }

    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user.type !== "Seller") {
        return res.status(403).send("Forbidden user");
      }
      next();
    };
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user.type !== "Admin") {
        return res.status(403).send("Forbidden user");
      }
      next();
    };

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "7d",
        });
        res.send({ token });
      } else {
        res.status(401).send({ token: "" });
      }
    });

    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/categories/:name", verifyJWT, async (req, res) => {
      const name = req.params.name;
      const query = { category: name };
      const bikes = await bikesCollection.find(query).toArray();
      res.send(bikes);
    });

    app.get("/products", verifyJWT, verifySeller, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const products = await bikesCollection.find(query).toArray();
      res.send(products);
    });

    app.get("/bikes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bikesCollection.findOne(query);
      res.send(result);
    });

    app.get("/blogs", async (req, res) => {
      const query = {};
      const result = await blogsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/bikes", verifyJWT, verifySeller, async (req, res) => {
      const bikeData = req.body;
      const bikes = await bikesCollection.insertOne(bikeData);
      res.send(bikes);
    });

    app.delete("/bikes/:id", verifyJWT, verifySeller, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bikesCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/category", async (req, res) => {
      const query = {};
      const result = await categoriesCollection
        .find(query)
        .project({ name: 1 })
        .toArray();
      res.send(result);
    });

    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ role: user?.type });
    });

    app.get("/users/seller", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { type: "Seller" };
      const sellers = await usersCollection.find(query).toArray();
      res.send(sellers);
    });
    app.get("/users/buyer", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { type: "Buyer" };
      const buyers = await usersCollection.find(query).toArray();
      res.send(buyers);
    });

    app.get("/user/sellerVerify/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        res.send(user);
      } catch (error) {
        console.log(error);
      }
    });

    app.post("/users", async (req, res) => {
      const users = req.body;
      const query = { email: users.email };
      const user = await usersCollection.findOne(query);
      if (user) {
        return;
      }
      const result = await usersCollection.insertOne(users);
      res.send(result);
    });

    app.delete("/users/buyer/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const user = await usersCollection.deleteOne(query);
      res.send(user);
    });

    app.put(
      "/users/sellerVerify/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        try {
          const id = req.params.id;
          const filter = { _id: ObjectId(id) };
          const options = { upsert: true };
          const updateDoc = {
            $set: {
              verify: true,
            },
          };
          const update = await usersCollection.updateOne(
            filter,
            updateDoc,
            options
          );
          res.send(update);
        } catch (error) {
          console.log(error);
        }
      }
    );

    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = parseFloat(price) * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "USD",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.get("/bookings", verifyJWT, verifyBuyer, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookingsCollection.findOne(query);
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/payment", async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      const id = payment.bookingId;
      const bikeId = payment.bikeId;
      const query = { _id: ObjectId(id) };
      const filter = { _id: ObjectId(bikeId) };
      const updateDoc = {
        $set: {
          transactionId: payment.transactionId,
          paid: true,
        },
      };
      const updateSold = {
        $set: {
          sold: true,
        },
      };
      const update = await bookingsCollection.updateOne(query, updateDoc);
      const updateBike = await bikesCollection.updateOne(filter, updateSold);
      res.send(result);
    });

    app.get("/reports", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        const query = {};
        const reportItems = await reportsCollection.find(query).toArray();
        res.send(reportItems);
      } catch (error) {
        console.log(error);
      }
    });

    app.post("/reports", verifyJWT, async (req, res) => {
      try {
        const report = req.body;
        const result = await reportsCollection.insertOne(report);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    app.delete("/reports/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await reportsCollection.deleteOne(query);
      const filter = { _id: ObjectId(id) };
      const bike = await bikesCollection.deleteOne(filter);
      res.send(result);
    });

    app.get("/advertises", async (req, res) => {
      const query = {};
      const result = await advertisesCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/advertises", verifyJWT, verifySeller, async (req, res) => {
      const advertise = req.body;
      const result = await advertisesCollection.insertOne(advertise);
      res.send(result);
    });

    app.put("/makeAdmin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          type: "Admin",
        },
      };
      const updateRole = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(updateRole);
    });
  } finally {
  }
}
run().catch((er) => console.log(er));

app.get("/", (req, res) => {
  res.send("Bike reader server is running");
});
app.listen(port, (req, res) => {
  console.log(`Bike reader server is running on ${port}`);
});
