const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jdz03.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


//jwt token 
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}




async function run() {
    try {
      await client.connect();
      const toolsCollection = client.db('home_tools').collection('services');
      const userCollection = client.db('home_tools').collection('users');
      const orderCollection = client.db('home_tools').collection('order');
      const reviewCollection = client.db('home_tools').collection('review');


       //login the admin 

       app.get('/admin/:email', async (req, res) => {
        const email = req.params.email;
        const user = await userCollection.findOne({ email: email });
        const isAdmin = user.role === 'admin';
        res.send({ admin: isAdmin })
    })

    //admin verify function
    const verifyAdmin = async (req, res, next) => {
        const requester = req.decoded.email;
        const requesterAccount = await userCollection.findOne({ email: requester });
        if (requesterAccount.role === 'admin') {
            next();
        }
        else {
            res.status(403).send({ message: 'forbidden' });
        }
    }

    //make admin
    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
        const email = req.params.email;
        const filter = { email: email };
        const updateDoc = {
            $set: { role: 'admin' },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
    })


    // getting user  
    app.get('/user', verifyJWT, async (req, res) => {
        const users = await userCollection.find().toArray();
        res.send(users);
      });
    
 
      //purchase data api
      app.get('/purchase', async(req, res)=>{
        const query = {};
        const cursor = toolsCollection.find(query);
        const services = await cursor.toArray();
        res.send(services);
      })

      app.get('/purchase/:id', verifyJWT, async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const purchase = await toolsCollection.findOne(query);
        res.send(purchase);
    });


       // post the user order
       app.post('/order', async (req, res) => {
        const order = req.body;
        const result = await orderCollection.insertOne(order);
        res.send(result);
    })



     
        // putting user info 
        
        app.put('/user/:email', async (req, res) => {
          const email = req.params.email;
          const user = req.body;
          const filter = {user };
          const options = { upsert: true };
          const updateDoc = {
            $set: user,
          };
          const result = await userCollection.updateOne(filter, updateDoc, options);
          const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
          res.send({ result, token });
        });

        //update my profile api
        app.put('/userUpdate', async (req, res) => {
          const user = req.body;
          const email = user.email;
          const filter = { email: email};
          const options = { upsert: true };
          const updateDoc = {
              $set: user,
            };
          
          const result = await userCollection.updateOne(filter, updateDoc, options);
          res.send(result);
      })


      
      // getting the user profile data
      app.get('/userProfile/:email', async (req, res) => {
          const email = req.params.email;
          console.log(email);
          const filter = { email: email };
          const result = await userCollection.findOne(filter);
          res.send(result);
      })

          // getting the user order data
          app.get('/orders/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await orderCollection.find(query).toArray();
            res.send(result);
        })

        // Delete the order by id
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await orderCollection.deleteOne(query)
            res.send(result);
        })

        //add reviews in database
        app.post('/review', async (req, res) => {
          const user = req.body;
          const result = await reviewCollection.insertOne(user);
          res.send(result);
      })
      //get reviews for home page 
      app.get('/review', async (req, res) => {
          const query = {};
          const cursor = reviewCollection.find(query);
          const services = await cursor.toArray();
          res.send(services);
      })
    }
    finally{``

    }
}

run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Hello From home depot!')
  })
  
  app.listen(port, () => {
    console.log(`my App listening on port ${port}`)
  })