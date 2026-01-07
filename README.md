# Commute Copilot 🚌

A modern, real-time London bus arrivals app built with Next.js 14, featuring TfL-inspired design.

![Commute Copilot](https://img.shields.io/badge/TfL-Powered-0019A8?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square)

## Features

- 🔍 **Search stops** by name or 5-digit stop code
- ⏱️ **Real-time arrivals** with auto-refresh every 15 seconds
- 📱 **Mobile-first** responsive design
- 🎨 **TfL-inspired UI** with familiar design patterns
- 🔄 **Offline detection** with network status indicator
- ⚡ **Fast** with React Query caching

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### 1. Clone and Install

```bash
cd commute-copilot
npm install
```

### 2. Get a TfL API Key (Required)

The app uses the TfL Unified API for real-time bus data. You need a free API key:

1. Go to **[https://api-portal.tfl.gov.uk/](https://api-portal.tfl.gov.uk/)**
2. Click **"Sign up"** and create an account
3. Verify your email address
4. **Sign in** and go to **"Products"**
5. Click **"500 requests per minute"** and subscribe (it's free!)
6. Go to your **"Profile"** section
7. Copy your **Primary key** or **Secondary key**

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Create the file
touch .env.local

# Add your API key
echo "TFL_API_KEY=your_api_key_here" >> .env.local
```

Or manually create `.env.local` with:

```env
TFL_API_KEY=your_api_key_here
```

> ⚠️ **Note:** Without an API key, the app will still work but is limited to 50 requests per minute. With an API key, you get 500 requests per minute.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── tfl/           # TfL API endpoints
│   │   └── arcgis/        # ArcGIS stop codes
│   ├── stop/[id]/         # Stop detail page
│   └── page.tsx           # Home/search page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # App components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities & API clients
└── types/                # TypeScript types
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** TanStack React Query
- **Data Source:** TfL Unified API + TfL ArcGIS Open Data
- **Type Safety:** TypeScript 5

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/tfl/stops/search` | Search stops by name/code |
| `/api/tfl/stop/[id]` | Get stop details |
| `/api/tfl/arrivals/[id]` | Get live arrivals |
| `/api/arcgis/stopcodes` | Get 5-digit stop codes |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TFL_API_KEY` | Yes* | Your TfL API key from [api-portal.tfl.gov.uk](https://api-portal.tfl.gov.uk/) |

*The app works without it but with rate limits.

## Troubleshooting

### "500 Internal Server Error" on API calls

1. Make sure you have set the `TFL_API_KEY` in `.env.local`
2. Restart the dev server after adding the environment variable
3. Verify your API key is valid at [api-portal.tfl.gov.uk](https://api-portal.tfl.gov.uk/)

### "Rate limit exceeded"

You're making too many requests. Either:
- Wait a minute and try again
- Add a TfL API key to increase limits to 500 req/min

## Attribution

This app uses:
- **TfL Open Data** - Contains Transport for London data provided under the [Open Government Licence](https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service)
- **TfL ArcGIS Hub** - Bus stop reference data from [TfL GIS Open Data Hub](https://tfl-gis-opendata-hub-tfl.hub.arcgis.com/)

## License

MIT
