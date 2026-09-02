# CertiFlow – Bulk Certificate Generation Platform

> **Generate hundreds of personalized certificates in seconds.**

CertiFlow is a full-stack web application that allows organizations, colleges, course creators, and event organizers to generate personalized certificates in bulk. Upload a certificate template, design dynamic fields, import recipients via CSV, and download all certificates as a ZIP file.

![CertiFlow](https://via.placeholder.com/800x400?text=CertiFlow+Dashboard)

---

## ✨ Features

- **User Authentication** – Secure sign up, login, and logout with Supabase Auth
- **Project Management** – Create, view, and delete certificate projects
- **Template Upload** – Upload PNG/JPG certificate backgrounds
- **Visual Certificate Editor** – Drag-and-drop dynamic field positioning with customizable fonts, colors, and alignment
- **CSV Import** – Upload recipient data with automatic parsing and validation
- **Certificate Preview** – Preview any recipient's certificate before generation
- **Bulk Generation** – Generate certificates client-side using Canvas API (supports 100+ certificates)
- **ZIP Download** – Download all certificates as a single ZIP file
- **Project History** – View and download previously generated certificates
- **Row Level Security** – Users can only access their own projects and data
- **Responsive Design** – Works on desktop and mobile devices

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              Frontend (React + Vite)         │
│  ┌─────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Landing  │  │Dashboard │  │  Editor    │ │
│  │  Page    │  │  Page    │  │  Page      │ │
│  └─────────┘  └──────────┘  └────────────┘ │
│         │              │            │        │
│  ┌──────────────────────────────────────┐   │
│  │         Supabase Client              │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────┐
│           Vercel Serverless Functions        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Projects  │  │ Template │  │Certificate│  │
│  │  API      │  │ Upload   │  │ Generate  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────┐
│              Supabase Backend                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │PostgreSQL│  │ Auth     │  │ Storage  │  │
│  │ Database │  │ Service  │  │ Buckets  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Certificate Generation | Canvas API (client-side), @napi-rs/canvas (server-side) |
| ZIP Creation | JSZip (client-side), Archiver (server-side) |
| Deployment | Vercel |

---

## 📁 Project Structure

```
certiflow/
├── api/                          # Vercel Serverless Functions
│   ├── lib/
│   │   └── supabase.js           # Server-side Supabase client
│   ├── projects/
│   │   ├── index.js              # GET/POST /api/projects
│   │   └── [id]/
│   │       ├── index.js          # GET/DELETE /api/projects/:id
│   │       ├── fields.js         # GET/POST /api/projects/:id/fields
│   │       ├── recipients.js     # GET/POST /api/projects/:id/recipients
│   │       ├── generate.js       # POST /api/projects/:id/generate
│   │       ├── generated.js      # GET /api/projects/:id/generated
│   │       └── download.js       # GET /api/projects/:id/download
│   └── template/
│       └── upload.js             # POST /api/template/upload
├── src/                          # Frontend React Application
│   ├── components/
│   │   ├── CertificateEditor.jsx # Drag-and-drop certificate editor
│   │   └── CsvUpload.jsx         # CSV upload with parsing and preview
│   ├── pages/
│   │   ├── LandingPage.jsx       # Marketing landing page
│   │   ├── LoginPage.jsx         # User login
│   │   ├── SignUpPage.jsx        # User registration
│   │   ├── Dashboard.jsx         # Project list dashboard
│   │   ├── CreateProject.jsx     # Create new project
│   │   ├── ProjectEditor.jsx     # Multi-step project editor
│   │   ├── CertificatePreview.jsx# Preview certificates
│   │   ├── GenerationProgress.jsx# Generate and download
│   │   └── ProjectHistory.jsx    # View project details
│   ├── hooks/
│   │   └── useAuth.js            # Authentication hook
│   ├── lib/
│   │   ├── supabase.js           # Supabase client
│   │   └── api.js                # API helper functions
│   ├── utils/
│   │   └── certificateGenerator.js # Client-side certificate rendering
│   ├── App.jsx                   # Main app with routing
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
├── supabase/
│   └── schema.sql                # Database schema with RLS
├── .env.example                  # Environment variables template
├── index.html                    # HTML entry point
├── package.json                  # Dependencies
├── postcss.config.js             # PostCSS config
├── tailwind.config.js            # Tailwind CSS config
├── vercel.json                   # Vercel deployment config
├── vite.config.js                # Vite build config
└── README.md                     # This file
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (free tier works)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd certiflow
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Set Up Supabase

Follow the [Supabase Setup](#-supabase-setup) section below.

### 4. Start Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🗄️ Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose a project name and database password
4. Select a region closest to your users
5. Click **Create new project**

### Step 2: Execute the Database Schema

1. In your Supabase dashboard, go to the **SQL Editor**
2. Open the file `supabase/schema.sql` from this project
3. Copy the entire SQL content and paste it into the SQL Editor
4. Click **Run** to execute the schema
5. This creates all required tables and Row Level Security policies

### Step 3: Configure Storage Buckets

The schema SQL creates the storage buckets automatically. If not:

1. Go to **Storage** in your Supabase dashboard
2. Create a bucket named `templates` (public)
3. Create a bucket named `generated` (public)

### Step 4: Get Your API Keys

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the **Project URL** – this is your `VITE_SUPABASE_URL`
3. Copy the **anon/public** key – this is your `VITE_SUPABASE_ANON_KEY`
4. Copy the **service_role** key – this is your `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **Important**: The `service_role` key bypasses Row Level Security. Never expose it to the frontend. It should only be used in server-side API routes.

---

## 🌐 Vercel Deployment

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial CertiFlow setup"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Import into Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Vercel will auto-detect the Vite configuration

### Step 3: Configure Environment Variables

In the Vercel project settings, add these environment variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Production, Preview, Development |

### Step 4: Deploy

Click **Deploy**. Vercel will:
1. Build the frontend with Vite
2. Deploy serverless functions from the `api/` directory
3. Serve the static frontend

### Step 5: Test

1. Visit your deployed URL
2. Sign up for a new account
3. Create a project, upload a template, add fields, upload CSV
4. Generate and download certificates

---

## 📋 Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Frontend + Server | Your Supabase project URL (safe for browser) |
| `VITE_SUPABASE_ANON_KEY` | Frontend + Server | Your Supabase anonymous key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Your Supabase service role key (**SECRET** – server-side only) |

> The `VITE_` prefix means Vite will embed these in the frontend bundle. The `SUPABASE_SERVICE_ROLE_KEY` must **never** be prefixed with `VITE_` – it should only be available in serverless functions.

---

## 🧪 Testing the Application

### Local Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Test Checklist

- [ ] Sign up with a new account
- [ ] Log in and see the dashboard
- [ ] Create a new project
- [ ] Upload a certificate template (PNG/JPG)
- [ ] Add and position dynamic fields on the editor
- [ ] Save fields configuration
- [ ] Upload a CSV file with recipients
- [ ] Preview a recipient's certificate
- [ ] Generate all certificates
- [ ] Download the ZIP file
- [ ] Verify individual certificate quality
- [ ] Check project appears in dashboard history
- [ ] Delete a project
- [ ] Verify RLS (cannot access other users' data)

### Sample CSV File

```csv
Name,Course,Date
Rahul Sharma,Java Programming,2026-09-02
Priya Patel,Web Development,2026-09-02
Amit Kumar,Python Basics,2026-09-02
Sneha Reddy,Data Science,2026-09-02
Vikram Singh,Machine Learning,2026-09-02
```

---

## 🔒 Security

- **Row Level Security (RLS)** is enabled on all database tables
- Users can only access their own projects, recipients, and certificates
- The `service_role` key is only used in serverless functions (never exposed to frontend)
- File uploads are validated for type and size
- API routes verify user authentication on every request
- CORS is configured for API routes

---

## ⚠️ Limitations

- **Vercel Function Timeout**: Hobby plan has 10s timeout. For 100+ certificates, client-side generation is used.
- **File Size Limits**: Vercel serverless functions have a 4.5MB request body limit. Large CSV files are handled client-side.
- **No Background Jobs**: Generation runs synchronously. For very large batches (500+), a background job system would be needed.
- **Client-Side Generation**: Certificate rendering uses the browser's Canvas API for maximum compatibility.

---

## 🔮 Future Improvements

- [ ] PDF certificate generation
- [ ] Custom font uploads for certificates
- [ ] More dynamic fields beyond Name/Course/Date
- [ ] Email delivery of certificates
- [ ] Certificate templates gallery
- [ ] Team/organization support
- [ ] Background job queue for large batches
- [ ] Certificate verification system with unique IDs
- [ ] Dark mode support
- [ ] API access for programmatic generation

---

## 📄 License

MIT License. Built with ❤️ for developers and educators.

---

## 🙋 Support

If you have questions or issues:
1. Check the [Supabase docs](https://supabase.com/docs)
2. Check the [Vercel docs](https://vercel.com/docs)
3. Open an issue on GitHub
