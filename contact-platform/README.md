# Nexora Contacts Platform

Production-ready rewrite of the Nexora Contacts prototype.

## Stack

- Backend: Go, `net/http`, PostgreSQL via `pgx`
- Frontend: Next.js App Router
- Cache/rate limit: Valkey
- Auth: signed HttpOnly session cookie, bcrypt password hashes
- Storage: local filesystem under `/data/uploads`, isolated behind upload API so it can be replaced by S3-compatible storage later
- Deployment: Docker Compose

## Features

- Root super user seeded from `CONTACT_ROOT_PASSWORD` or legacy `/etc/nexora-contact.env` `ADMIN_PASSWORD`
- Seeded Nexora green, White and Dark design presets
- Ordinary user registration/login with no admin privileges
- Role-guarded dashboard
- Valkey-backed auth rate limiting for login and registration
- Person cards and store cards
- Multiple phones
- Optional email, website, address
- Company separate from position; company is written to VCF `ORG`
- Products for store cards
- Custom fields
- Public cards by slug
- VCF export
- SVG/PNG/JPEG/WEBP logos
- PNG/JPEG/WEBP profile/product photos
- Design editor and live card preview
- Legacy JSON import command

## Local Run

```bash
cd /root/nexora/contact-platform
cp .env.example .env
docker compose up --build
```

Open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8080/health`

For production on `contact.nexora.kg`, set strong `POSTGRES_PASSWORD`, `SESSION_SECRET`, and either `CONTACT_ROOT_PASSWORD` or legacy `ADMIN_PASSWORD` in an env file. `VALKEY_URL` defaults to `redis://valkey:6379/0` in Docker Compose. The API refuses to start with missing or placeholder auth secrets, or if Valkey is unavailable.

Login as:

- user: `root`
- password: value from `CONTACT_ROOT_PASSWORD` or legacy `ADMIN_PASSWORD`

## Legacy Import

After backend is up:

```bash
docker compose exec backend /app/import-legacy /var/lib/nexora-contact/contacts.json
```

Mount the legacy data directory if importing on another host.

## Manual QA Checklist

- Register ordinary user and confirm dashboard access is denied.
- Login as root and confirm dashboard opens.
- Create a person card with company, phones, website, address and custom fields.
- Publish it and open `/cards/{slug}` without login.
- Download VCF and verify `ORG`, `TITLE`, phones, website and address.
- Upload SVG logo and confirm it renders.
- Create a store card with two products and product photos.
- Edit card and confirm live preview updates while typing.
- Create and edit a design.
- Try uploading SVG as product/profile photo and confirm it is rejected.
