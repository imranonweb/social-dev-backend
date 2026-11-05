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

// Create Event (Private - Logged in user only)
app.post('/events', verifyToken, async (req, res) => {
  try {
    const { title, description, eventType, thumbnail, location, eventDate } = req.body

    // Validation
    if (!title || !description || !eventType || !thumbnail || !location || !eventDate) {
      return res.status(400).send({ message: 'All event fields are required' })
    }

    // Ensure event date is in the future
    const todayDateOnly = new Date()
    todayDateOnly.setHours(0, 0, 0, 0)
    const inputDate = new Date(eventDate)

    if (isNaN(inputDate.getTime())) {
      return res.status(400).send({ message: 'Invalid event date format' })
    }

    if (inputDate < todayDateOnly) {
      return res.status(400).send({ message: 'Event date must be in the future. Past dates are not allowed.' })
    }

    const newEvent = {
      title,
      description,
      eventType,
      thumbnail,
      location,
      eventDate,
      creatorEmail: req.user.email,
      creatorName: req.body.creatorName || '',
      createdAt: new Date()
    }

    const result = await eventsCollection.insertOne(newEvent)
    res.status(201).send(result)
  } catch (error) {
    res.status(500).send({ message: 'Failed to create event', error: error.message })
  }
})

// 6 Recent Upcoming Events for Home Page (uses .limit(6))
app.get('/events/recent', async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0]
    const query = {
      $or: [
        { eventDate: { $gte: todayStr } },
        { eventDate: { $gte: new Date() } }
      ]
    }

    const result = await eventsCollection
      .find(query)
      .sort({ eventDate: 1 })
      .limit(6)
      .toArray()

    res.send(result)
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch recent events', error: error.message })
  }
})

// All Upcoming Events (Public Page)
app.get('/events', async (req, res) => {
  try {
    const { search, type, sort } = req.query
    const todayStr = new Date().toISOString().split('T')[0]

    const query = {
      $or: [
        { eventDate: { $gte: todayStr } },
        { eventDate: { $gte: new Date() } }
      ]
    }

    if (type && type !== 'All') {
      query.eventType = type
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' }
    }

    let sortOrder = { eventDate: 1 }
    if (sort === 'desc') {
      sortOrder = { eventDate: -1 }
    }

    const result = await eventsCollection.find(query).sort(sortOrder).toArray()
    res.send(result)
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch upcoming events', error: error.message })
  }
})

// Manage Events: Get events created by logged-in user (Private)
app.get('/my-events', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email
    if (req.query.email && req.query.email !== userEmail) {
      return res.status(403).send({ message: 'Forbidden access to other user events' })
    }

    const result = await eventsCollection
      .find({ creatorEmail: userEmail })
      .sort({ createdAt: -1 })
      .toArray()

    res.send(result)
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch my events', error: error.message })
  }
})

// View Event Details (Public Page)
app.get('/events/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'Invalid Event ID format' })
    }

    const result = await eventsCollection.findOne({ _id: new ObjectId(id) })
    if (!result) {
      return res.status(404).send({ message: 'Event not found' })
    }

    res.send(result)
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch event details', error: error.message })
  }
})

// Update Event (Private - Only creator can update)
app.put('/events/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'Invalid Event ID format' })
    }

    const existingEvent = await eventsCollection.findOne({ _id: new ObjectId(id) })
    if (!existingEvent) {
      return res.status(404).send({ message: 'Event not found' })
    }

    if (existingEvent.creatorEmail !== req.user.email) {
      return res.status(403).send({ message: 'Forbidden: You can only update your own events' })
    }

    if (req.body.eventDate) {
      const todayDateOnly = new Date()
      todayDateOnly.setHours(0, 0, 0, 0)
      const inputDate = new Date(req.body.eventDate)
      if (inputDate < todayDateOnly) {
        return res.status(400).send({ message: 'Event date must be in the future. Past dates are not allowed.' })
      }
    }

    const { _id, creatorEmail, createdAt, ...updateData } = req.body
    updateData.updatedAt = new Date()

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    res.send(result)
  } catch (error) {
    res.status(500).send({ message: 'Failed to update event', error: error.message })
  }
})

// Delete Event (Private - Only creator can delete)
app.delete('/events/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'Invalid Event ID format' })
    }

    const existingEvent = await eventsCollection.findOne({ _id: new ObjectId(id) })
    if (!existingEvent) {
      return res.status(404).send({ message: 'Event not found' })
    }

    if (existingEvent.creatorEmail !== req.user.email) {
      return res.status(403).send({ message: 'Forbidden: You can only delete your own events' })
    }

    const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) })
    await joinedEventsCollection.deleteMany({ eventId: id })

    res.send(result)
  } catch (error) {
    res.status(500).send({ message: 'Failed to delete event', error: error.message })
  }
})

// Join Event (Private - Logged in user)
app.post('/joined-events', verifyToken, async (req, res) => {
  try {
    const { eventId, userName, userPhoto } = req.body

    if (!eventId || !ObjectId.isValid(eventId)) {
      return res.status(400).send({ message: 'Valid Event ID is required' })
    }

    const event = await eventsCollection.findOne({ _id: new ObjectId(eventId) })
    if (!event) {
      return res.status(404).send({ message: 'Event not found' })
    }

    const alreadyJoined = await joinedEventsCollection.findOne({
      eventId,
      userEmail: req.user.email
    })

    if (alreadyJoined) {
      return res.status(400).send({ message: 'You have already joined this event' })
    }

    const joinRecord = {
      eventId,
      eventTitle: event.title,
      eventType: event.eventType,
      eventDate: event.eventDate,
      thumbnail: event.thumbnail,
      location: event.location,
      userEmail: req.user.email,
      userName: userName || '',
      userPhoto: userPhoto || '',
      joinedAt: new Date()
    }

    const result = await joinedEventsCollection.insertOne(joinRecord)
    res.status(201).send(result)
  } catch (error) {
    res.status(500).send({ message: 'Failed to join event', error: error.message })
  }
})

// Check if user has already joined a specific event (Private)
app.get('/joined-events/check/:eventId', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params
    const record = await joinedEventsCollection.findOne({
      eventId,
      userEmail: req.user.email
    })

    res.send({ hasJoined: !!record, joinId: record?._id || null })
  } catch (error) {
    res.status(500).send({ message: 'Failed to check join status', error: error.message })
  }
})

// Joined Events Page: Show all events joined by logged-in user sorted by event date (Private)
app.get('/joined-events', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email
    if (req.query.email && req.query.email !== userEmail) {
      return res.status(403).send({ message: 'Forbidden access to other user joined events' })
    }

    const result = await joinedEventsCollection
      .find({ userEmail })
      .sort({ eventDate: 1 })
      .toArray()

    res.send(result)
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch joined events', error: error.message })
  }
})

// Cancel Joined Event (Private - Only joining user can cancel)
app.delete('/joined-events/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: 'Invalid registration ID' })
    }

    const record = await joinedEventsCollection.findOne({ _id: new ObjectId(id) })
    if (!record) {
      return res.status(404).send({ message: 'Joined event record not found' })
    }

    if (record.userEmail !== req.user.email) {
      return res.status(403).send({ message: 'Forbidden: You can only cancel your own joined events' })
    }

    const result = await joinedEventsCollection.deleteOne({ _id: new ObjectId(id) })
    res.send(result)
  } catch (error) {
    res.status(500).send({ message: 'Failed to cancel attendance', error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`Server is running at port: ${PORT}`)
})
