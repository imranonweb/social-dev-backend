# Social Development Events Platform - Server

A robust, community-driven backend API service built with Express.js and MongoDB Atlas to manage social service events (such as cleanup campaigns, plantation drives, blanket donations, blood donations, food distribution, etc.).

## 🚀 Features

- **Event Lifecycle (CRUD)**: Create, view, update, and delete community events.
- **Future Date Validation**: Strict server-side validation ensuring only future dates are accepted.
- **Ownership Scoping**: Users can only update or delete events created by their account.
- **Join / RSVP Management**: Users can join events, track joined activities sorted by date, and cancel their attendance (prevents duplicate joins).
- **JWT Protection**: Secure middleware verifying JSON Web Tokens for all sensitive endpoints.
- **CORS Configured**: Pre-configured for Next.js frontend communication (both local dev and production).

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js (v5)
- **Database**: MongoDB Atlas (MongoDB Driver v7)
- **Authentication**: JSON Web Token (`jsonwebtoken`)
- **Environment**: `dotenv`
- **Cross-Origin**: `cors`

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your_jwt_secret_key
DB_NAME=social_dev_db
```

---

## 🏃 Running the Server

```bash
# Install dependencies
npm install

# Run in watch/development mode
npm run dev

# Inspect database records directly in terminal
npm run check-db

# Run in production mode
npm start
```

---

## 📡 API Endpoints Reference

### 1. Base / Health Check & Inspection
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/` | Public | Returns server health and status message |
| `GET` | `/all-data` | Public | Returns complete overview and counts of all events and joined registrations |

### 2. Authentication
| Method | Endpoint | Access | Body Payload | Description |
|---|---|---|---|---|
| `POST` | `/jwt` | Public | `{ "email": "user@example.com" }` | Signs and returns a 7-day valid JWT token |

### 3. Events
| Method | Endpoint | Access | Headers / Query / Body | Description |
|---|---|---|---|---|
| `GET` | `/events/recent` | Public | None | Returns 6 nearest upcoming events (`.limit(6)`) for Home Page |
| `GET` | `/events` | Public | Query: `?search=&type=&sort=desc` | Returns all upcoming events (filters past dates) |
| `GET` | `/events/:id` | Public | URL Param: `:id` | Returns single event details by MongoDB ID |
| `POST` | `/events` | Private (JWT) | Bearer Token, Body: `{ title, description, eventType, thumbnail, location, eventDate }` | Creates a new event with future date validation |
| `GET` | `/my-events` | Private (JWT) | Bearer Token | Returns all events created by the logged-in user |
| `PUT` | `/events/:id` | Private (JWT) | Bearer Token, Body: `{ ...updatedFields }` | Updates event data (creator only) |
| `DELETE` | `/events/:id` | Private (JWT) | Bearer Token | Deletes event and cleans registrations (creator only) |

### 4. Joined Events
| Method | Endpoint | Access | Headers / Body | Description |
|---|---|---|---|---|
| `POST` | `/joined-events` | Private (JWT) | Bearer Token, Body: `{ eventId, userName, userPhoto }` | Joins an event (prevents duplicate joins) |
| `GET` | `/joined-events` | Private (JWT) | Bearer Token | Returns joined events for user, sorted chronologically |
| `GET` | `/joined-events/check/:eventId` | Private (JWT) | Bearer Token | Checks if user has already joined (`{ hasJoined: boolean }`) |
| `DELETE` | `/joined-events/:id` | Private (JWT) | Bearer Token | Cancels attendance for an event |

