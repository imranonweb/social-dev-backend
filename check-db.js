import { MongoClient } from 'mongodb'
import 'dotenv/config'

const client = new MongoClient(process.env.MONGODB_URI)

async function checkDatabase() {
  try {
    await client.connect()
    console.log('\n=============================================')
    console.log('📦 MONGODB ATLAS DATABASE INSPECTION')
    console.log(`Database: ${process.env.DB_NAME || 'social_dev_db'}`)
    console.log('=============================================\n')

    const db = client.db(process.env.DB_NAME || 'social_dev_db')
    const events = await db.collection('events').find().sort({ createdAt: -1 }).toArray()
    const joined = await db.collection('joined_events').find().sort({ joinedAt: -1 }).toArray()

    console.log(`📌 TOTAL EVENTS (${events.length}):`)
    if (events.length > 0) {
      console.table(events.map(e => ({
        ID: e._id.toString(),
        Title: e.title?.length > 32 ? e.title.slice(0, 29) + '...' : e.title,
        Type: e.eventType,
        Date: e.eventDate,
        Location: e.location?.length > 25 ? e.location.slice(0, 22) + '...' : e.location,
        Creator: e.creatorEmail || e.organizerEmail || 'N/A'
      })))
    } else {
      console.log('  No events found in database.')
    }

    console.log(`\n🤝 TOTAL JOINED REGISTRATIONS (${joined.length}):`)
    if (joined.length > 0) {
      console.table(joined.map(j => ({
        ID: j._id.toString(),
        EventTitle: (j.eventTitle || j.title)?.length > 30 ? (j.eventTitle || j.title).slice(0, 27) + '...' : (j.eventTitle || j.title),
        UserEmail: j.userEmail,
        UserName: j.userName || 'N/A',
        EventDate: j.eventDate
      })))
    } else {
      console.log('  No joined registrations found yet.')
    }

    console.log('=============================================\n')
  } catch (err) {
    console.error('Error connecting to database:', err.message)
  } finally {
    await client.close()
  }
}

checkDatabase()

