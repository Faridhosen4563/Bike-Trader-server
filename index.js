const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

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

async function run() {
  try {
    const categoriesCollection = client
      .db("BikeTrader")
      .collection("categories");
    const bikesCollection = client.db("BikeTrader").collection("bikes");
    const usersCollection = client.db("BikeTrader").collection("users");
    const bookingsCollection = client.db("BikeTrader").collection("bookings");

    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/categories/:name", async (req, res) => {
      const name = req.params.name;
      const query = { category: name };
      const bikes = await bikesCollection.find(query).toArray();
      res.send(bikes);
    });

    app.post("/bikes", async (req, res) => {
      const bikeData = req.body;
      const bikes = await bikesCollection.insertOne(bikeData);
      res.send(bikes);
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

    app.get("/users/seller", async (req, res) => {
      const query = { type: "Seller" };
      const sellers = await usersCollection.find(query).toArray();
      res.send(sellers);
    });
    app.get("/users/buyer", async (req, res) => {
      const query = { type: "Buyer" };
      const buyers = await usersCollection.find(query).toArray();
      res.send(buyers);
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

    app.delete("/users/buyer/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const user = await usersCollection.deleteOne(query);
      res.send(user);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
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
