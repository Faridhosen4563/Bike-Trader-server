const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
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
