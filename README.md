# GetMed – Prescription Delivery Platform

A full-stack Next.js 16 application for connecting patients with nearby pharmacies for prescription delivery.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database & Auth**: Supabase (PostgreSQL + Supabase Auth)
- **Storage**: Supabase Storage (prescriptions, insurance cards)
- **Maps**: Google Maps JavaScript API + Places Autocomplete + Geocoding
- **Styling**: Tailwind CSS
- **Language**: TypeScript

---

## Getting Started

### 1. Clone & Install

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key (enable Maps JS, Places, Geocoding) |
| `ADMIN_EMAIL` | Email address for the admin account |
| `NEXT_PUBLIC_ADMIN_EMAIL` | Same email (used client-side for route guard) |

### 3. Database Setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL editor.

Then create two Storage buckets in your Supabase dashboard:
- `prescriptions` (private)
- `insurance-cards` (private)

### 4. Create Admin Account

Create a user in Supabase Auth with the email matching `ADMIN_EMAIL`. This user will have admin access.

### 5. Run Development Server

```bash
npm run dev
```

---

## Application Routes

### Patient (Public)
| Route | Description |
|---|---|
| `/` | Landing page – address search |
| `/search` | Search results with pharmacy list + map |
| `/order` | Prescription upload / order form |
| `/order/confirmation` | Order confirmation page |

### Pharmacy
| Route | Description |
|---|---|
| `/pharmacy/register` | Pharmacy registration form |
| `/pharmacy/login` | Pharmacy login |
| `/pharmacy/dashboard` | Order management dashboard |

### Admin
| Route | Description |
|---|---|
| `/admin/login` | Admin login |
| `/admin` | Overview with stats |
| `/admin/pharmacies` | Approve/reject/soft-delete pharmacies |
| `/admin/orders` | Monitor all orders with filters |
| `/admin/settings` | Configure search radius and other settings |

---

## Features

### Patient Flow
- Address autocomplete (Google Places API, Canada)
- Nearby pharmacy search with configurable radius (default 10 km)
- Pharmacy cards: name, address, phone, distance, rating, hours, payment methods
- Google Map with clickable markers synced to card highlight
- Order types: **OTC** (list meds), **Prescription** (upload image), **Transfer** (from another pharmacy)
- Prescription & insurance card image upload (images only, max 10 MB)
- Optional health card number
- Order confirmation page with next-steps instructions and prescription warning

### Pharmacy Flow
- Registration with address autocomplete, opening hours, payment methods, T&C acceptance
- Pending approval — must be approved by admin before appearing in search
- Dashboard: order stats, filterable order list, status updates
- View prescription/insurance images via signed URLs (secure, time-limited)
- Status flow: `pending → processing → ready_for_delivery → delivered`

### Admin Flow
- Protected dashboard (email-based admin check, server-side enforced)
- Pharmacy management: approve, reject, soft-delete
- Order monitoring with filters (pharmacy, city, date, status)
- Admin cannot view prescription or insurance images (by design)
- Configurable search radius via platform settings

---

## Security

- Admin access enforced by email check on every API route
- Prescription/insurance images in private Supabase Storage buckets
- Pharmacies can only access images for their own orders (path-based check)
- Admin has no access to patient prescription/insurance images
- Row Level Security (RLS) enabled on all tables
- Service role key used only server-side in API routes

---

## Database Schema

See `supabase/schema.sql` for the full schema:
- `pharmacies` — pharmacy profiles linked to Supabase Auth
- `orders` — patient orders with all details
- `platform_settings` — configurable settings (search radius, etc.)
