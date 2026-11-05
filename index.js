import express from 'express'
import { MongoClient, ObjectId } from 'mongodb'
import cors from 'cors'
import jwt from 'jsonwebtoken'
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

// JWT Verification Middleware
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Unauthorized access: No token provided' })
  }

  const token = authHeader.split(' ')[1]
  jwt.verify(token, process.env.JWT_SECRET || 'social_dev_secret_key', (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access: Invalid or expired token' })
    }
    req.user = decoded
    next()
  })
}

// Database and Collections
const mongoClient = await connectToMongoDB()
const db = mongoClient.db("social_dev_db")
const eventsCollection = db.collection("events")
const joinedEventsCollection = db.collection("joined_events")

// Root route
app.get('/', (req, res) => {
  res.send({ message: 'Social Development Events Platform Server is running fine!' })
})

// Authentication: Generate JWT Token
app.post('/jwt', async (req, res) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).send({ message: 'Email is required to generate token' })
  }

  const token = jwt.sign({ email }, process.env.JWT_SECRET || 'social_dev_secret_key', {
    expiresIn: '7d'
  })
  res.send({ success: true, token })
})

app.listen(PORT, () => {
  console.log(`Server is running at port: ${PORT}`)
})
