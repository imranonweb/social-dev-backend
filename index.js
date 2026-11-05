import express from 'express'
import cors from 'cors'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 5000

// Middlewares
app.use(cors())
app.use(express.json())

// Root route
app.get('/', (req, res) => {
  res.send({ message: 'Social Development Events Platform Server is running fine!' })
})

app.listen(PORT, () => {
  console.log(`Server is running at port: ${PORT}`)
})
