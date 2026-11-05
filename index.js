import express from 'express'
import { MongoClient, ObjectId } from 'mongodb'
import cors from 'cors'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 5000

const client = new MongoClient(process.env.MONGODB_URI)

export async function connectToMongoDB() {
  try {
    await client.connect()
    console.log("You successfully connected to MongoDB!")
    return client
  } catch (err) {
    console.dir(err)
  }
}

// Middlewares
app.use(cors())
app.use(express.json())

// Database and Collections
const mongoClient = await connectToMongoDB()
const db = mongoClient.db("social_dev_db")
const eventsCollection = db.collection("events")
const joinedEventsCollection = db.collection("joined_events")

// Root route
app.get('/', (req, res) => {
  res.send({ message: 'Social Development Events Platform Server is running fine!' })
})

app.listen(PORT, () => {
  console.log(`Server is running at port: ${PORT}`)
})
