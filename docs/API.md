# Fantasy Pet League - API Documentation

## 📋 Overview

Base URL: `http://localhost:3000` (local) or `https://your-app.railway.app` (production)

All endpoints return JSON. Authentication required endpoints need JWT token in `Authorization: Bearer <token>` header.

---

## 🔐 Authentication Endpoints

### POST `/auth/signup`
Create a new user account.

**Request:**
```json
{
  "passphrase": "quickly violet corgi",
  "firstName": "John",
  "city": "Houston",
  "discordId": "123456789"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid-here",
    "first_name": "John",
    "city": "Houston",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Passphrase required
- `500` - Server error

---

### POST `/auth/login`
Login with passphrase.

**Request:**
```json
{
  "passphrase": "quickly violet corgi"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid-here",
    "first_name": "John",
    "city": "Houston",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `400` - Passphrase required
- `401` - Invalid passphrase
- `500` - Server error

**Note:** Current implementation needs enhancement to look up users by passphrase properly.

---

## 🏆 League Endpoints

### POST `/leagues`
Create a new league. **Auth required.**

**Request:**
```json
{
  "name": "Houston Pet Lovers"
}
```

**Response (201):**
```json
{
  "id": "league-uuid",
  "name": "Houston Pet Lovers",
  "owner_id": "user-uuid",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Errors:**
- `400` - League name required
- `401` - Unauthorized (no token)
- `500` - Server error

---

### GET `/leagues`
List all leagues. **Auth required.**

**Query Parameters:** None

**Response (200):**
```json
[
  {
    "id": "league-uuid-1",
    "name": "Houston Pet Lovers",
    "owner_id": "user-uuid",
    "created_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": "league-uuid-2",
    "name": "Austin Dog League",
    "owner_id": "user-uuid-2",
    "created_at": "2024-01-14T14:20:00Z"
  }
]
```

**Errors:**
- `401` - Unauthorized (no token)
- `500` - Server error

---

## 🎮 Drafting Endpoints

### POST `/draft`
Draft a pet to your roster in a league. **Auth required.**

**Request:**
```json
{
  "leagueId": "league-uuid",
  "petId": "A2043899"
}
```

**Response (201):**
```json
{
  "id": "roster-entry-uuid",
  "drafted_at": "2024-01-15T10:30:00Z"
}
```

**Errors:**
- `400` - League and pet required
- `401` - Unauthorized (no token)
- `404` - Pet not found
- `409` - Pet already drafted in this league
- `500` - Server error

---

### GET `/myroster/:leagueId`
Get your drafted pets in a specific league. **Auth required.**

**Path Parameters:**
- `leagueId` (uuid) - The league ID

**Response (200):**
```json
[
  {
    "pet_id": "A2043899",
    "name": "Buddy",
    "breed": "German Shepherd Dog mix",
    "animal_type": "Dog",
    "gender": "Male",
    "age": "2 years",
    "source": "adoptables",
    "status": "available",
    "drafted_at": "2024-01-15T10:30:00Z"
  },
  {
    "pet_id": "A2043900",
    "name": "Bella",
    "breed": "Labrador Retriever mix",
    "animal_type": "Dog",
    "gender": "Female",
    "age": "1 year",
    "source": "adoptables",
    "status": "removed",
    "drafted_at": "2024-01-14T14:20:00Z"
  }
]
```

**Errors:**
- `401` - Unauthorized (no token)
- `500` - Server error

---

### DELETE `/draft/:petId/:leagueId`
Remove a pet from your roster. **Auth required.**

**Path Parameters:**
- `petId` (string) - External pet ID (e.g., A2043899)
- `leagueId` (uuid) - The league ID

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- `401` - Unauthorized (no token)
- `404` - Roster entry not found
- `500` - Server error

---

## 📊 Leaderboard Endpoints

### GET `/leaderboard/:leagueId`
Get league leaderboard and standings. **Public - no auth required.**

**Path Parameters:**
- `leagueId` (uuid) - The league ID

**Response (200):**
```json
[
  {
    "id": "user-uuid-1",
    "first_name": "John",
    "city": "Houston",
    "total_points": 15,
    "rank": 1
  },
  {
    "id": "user-uuid-2",
    "first_name": "Sarah",
    "city": "Austin",
    "total_points": 12,
    "rank": 2
  },
  {
    "id": "user-uuid-3",
    "first_name": "Mike",
    "city": "Dallas",
    "total_points": 8,
    "rank": 3
  }
]
```

**Errors:**
- `500` - Server error

---

## 🐾 Pets Endpoints

### GET `/pets`
List available pets with filters. **Public - no auth required.**

**Query Parameters:**
- `type` (string, optional) - Animal type: "dogs", "cats", etc.
- `status` (string, optional) - "available" or "removed"
- `source` (string, optional) - "adoptables" or "fosters"

**Examples:**
```
GET /pets?type=dogs&status=available
GET /pets?source=adoptables
GET /pets?status=available&source=fosters
```

**Response (200):**
```json
[
  {
    "id": "pet-uuid-1",
    "pet_id": "A2043899",
    "name": "Buddy",
    "breed": "German Shepherd Dog mix",
    "animal_type": "Dog",
    "gender": "Male",
    "age": "2 years",
    "brought_to_shelter": "2024-01-10",
    "location": "BARC",
    "source": "adoptables",
    "status": "available",
    "first_seen": "2024-01-15",
    "last_seen": "2024-01-15",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

**Errors:**
- `500` - Server error

---

## ⚙️ Admin Endpoints

All admin endpoints require **authentication** and **admin role**.

### GET `/admin/stats`
Get overall system statistics. **Admin only.**

**Response (200):**
```json
{
  "total_users": 42,
  "total_leagues": 8,
  "available_pets": 156,
  "adopted_pets": 89,
  "total_drafts": 234,
  "total_points_awarded": 312,
  "breed_points_configured": 47
}
```

**Errors:**
- `401` - Unauthorized (no token)
- `403` - Admin access required
- `500` - Server error

---

### GET `/admin/breeds`
List all breed points with pet counts. **Admin only.**

**Response (200):**
```json
[
  {
    "id": "breed-uuid-1",
    "breed": "German Shepherd Dog mix",
    "points": 2,
    "pet_count": "12",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": "breed-uuid-2",
    "breed": "Labrador Retriever mix",
    "points": 1,
    "pet_count": "8",
    "updated_at": "2024-01-14T14:20:00Z"
  }
]
```

**Errors:**
- `401` - Unauthorized (no token)
- `403` - Admin access required
- `500` - Server error

---

### GET `/admin/breeds/missing`
Get breeds in pets table that aren't in breed_points. **Admin only.**

**Response (200):**
```json
[
  {
    "breed": "Mixed Breed",
    "pet_count": "23"
  },
  {
    "breed": "Domestic Shorthair",
    "pet_count": "5"
  }
]
```

**Errors:**
- `401` - Unauthorized (no token)
- `403` - Admin access required
- `500` - Server error

---

### POST `/admin/breeds/auto-populate`
Auto-populate missing breeds with default 1 point. **Admin only.**

**Request:** No body needed

**Response (201):**
```json
{
  "success": true,
  "added": 5,
  "breeds": [
    {
      "breed": "Mixed Breed",
      "points": 1
    },
    {
      "breed": "Domestic Shorthair",
      "points": 1
    }
  ]
}
```

**Errors:**
- `401` - Unauthorized (no token)
- `403` - Admin access required
- `500` - Server error

---

### POST `/admin/breeds`
Create a new breed point entry. **Admin only.**

**Request:**
```json
{
  "breed": "Staffordshire Bull Terrier mix",
  "points": 3
}
```

**Response (201):**
```json
{
  "id": "breed-uuid",
  "breed": "Staffordshire Bull Terrier mix",
  "points": 3,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Errors:**
- `400` - Breed and points required
- `401` - Unauthorized (no token)
- `403` - Admin access required
- `500` - Server error

---

### PUT `/admin/breeds/:breedId`
Update breed points. **Admin only.**

**Path Parameters:**
- `breedId` (uuid) - The breed point entry ID

**Request:**
```json
{
  "points": 5
}
```

**Response (200):**
```json
{
  "id": "breed-uuid",
  "breed": "Staffordshire Bull Terrier mix",
  "points": 5,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T11:45:00Z"
}
```

**Errors:**
- `400` - Points must be >= 1
- `401` - Unauthorized (no token)
- `403` - Admin access required
- `404` - Breed not found
- `500` - Server error

---

### DELETE `/admin/breeds/:breedId`
Delete a breed point entry. **Admin only.**

**Path Parameters:**
- `breedId` (uuid) - The breed point entry ID

**Response (200):**
```json
{
  "success": true,
  "deleted": {
    "id": "breed-uuid",
    "breed": "Staffordshire Bull Terrier mix",
    "points": 5
  }
}
```

**Errors:**
- `401` - Unauthorized (no token)
- `403` - Admin access required
- `404` - Breed not found
- `500` - Server error

---

### GET `/admin/scraper-logs`
Get recent scraper run logs. **Admin only.**

**Response (200):**
```json
[
  {
    "id": "log-uuid-1",
    "source": "combined",
    "run_date": "2024-01-15T02:00:00Z",
    "pets_found": 189,
    "new_pets": 12,
    "removed_pets": 3,
    "points_awarded": 5,
    "error_message": null
  },
  {
    "id": "log-uuid-2",
    "source": "combined",
    "run_date": "2024-01-14T02:00:00Z",
    "pets_found": 185,
    "new_pets": 8,
    "removed_pets": 1,
    "points_awarded": 2,
    "error_message": null
  }
]
```

**Errors:**
- `401` - Unauthorized (no token)
- `403` - Admin access required
- `500` - Server error

---

## 🏥 Health Check

### GET `/health`
Check if server is running. **Public - no auth required.**

**Response (200):**
```json
{
  "status": "ok"
}
```

---

## 🔗 Admin Dashboard Routes

### GET `/admin-dashboard`
Serves the admin dashboard HTML page. Requires login on page load.

---

## 📝 Error Responses

All errors follow this format:

```json
{
  "error": "Description of what went wrong"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad request (invalid data)
- `401` - Unauthorized (no token or invalid token)
- `403` - Forbidden (token valid but insufficient permissions)
- `404` - Not found
- `409` - Conflict (duplicate entry)
- `500` - Server error

---

## 🔑 Authentication

### Getting a Token

1. Call `/auth/signup` or `/auth/login`
2. Receive `token` in response
3. Store token securely (localStorage or secure cookie)

### Using a Token

Include in request header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration

- Tokens expire in **7 days**
- After expiration, user must login again
- Frontend should handle 401 responses by redirecting to login

---

## 🔄 Rate Limiting

Currently not implemented. Recommended for production:
- Admin endpoints: 10 requests/minute
- Public endpoints: 30 requests/minute
- Auth endpoints: 5 requests/minute per IP

---

## 📚 Related Documentation

- [Complete Setup Guide](../COMPLETE_SETUP.md)
- [Discord Bot Commands](DISCORD_BOT.md)
- [Admin Dashboard Features](ADMIN_DASHBOARD.md)
- [Scraper Setup](../SCRAPER_SETUP.md)
