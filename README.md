# Cheap Flight Finder ✈

Find the cheapest flights worldwide with at least 10kg checked luggage included.

## Setup

### 1. Get free API credentials

Sign up at **https://developers.amadeus.com** (free, no credit card needed).  
Create an app and copy your **Client ID** and **Client Secret**.

### 2. Configure credentials

```bash
cp .env.example .env
# Edit .env and add your credentials
```

### 3. Install dependencies

```bash
npm install
```

---

## Usage

### Interactive mode (recommended for first use)

```bash
node src/index.js
```

### Explore the cheapest destinations from your airport

```bash
node src/index.js explore --origin LHR --date 2025-08 --max-price 400
```

| Flag | Description |
|------|-------------|
| `-o, --origin` | Your departure airport code (LHR, JFK, DXB…) |
| `-d, --date` | Travel month `YYYY-MM` |
| `-p, --max-price` | Max price in USD |
| `-c, --currency` | Currency code (default: USD) |
| `--one-way` | One-way fares only |

### Search a specific route with luggage filter

```bash
node src/index.js search --origin LHR --destination BKK --date 2025-08-15 --return-date 2025-08-30 --min-bags 20
```

| Flag | Description |
|------|-------------|
| `-o, --origin` | Origin airport code |
| `-D, --destination` | Destination airport code |
| `-d, --date` | Departure date `YYYY-MM-DD` |
| `-r, --return-date` | Return date (omit for one-way) |
| `-a, --adults` | Number of passengers (default: 1) |
| `-p, --max-price` | Max total price |
| `-b, --min-bags` | Minimum checked baggage in kg (default: **10kg**) |
| `-c, --currency` | Currency code |
| `--non-stop` | Direct flights only |

### Look up airport codes

```bash
node src/index.js airport "Bangkok"
node src/index.js airport "London"
```

---

## Example output

```
✈  Cheap Flight Finder
   Find the best deals worldwide with luggage included

  Cheapest destinations from LHR:

  ┌──────────────┬──────────────────────┬──────────────┬──────────────┬──────────────┬──────────┐
  │ Destination  │ City                 │ Price (USD)  │ Depart       │ Return       │ Bags     │
  ├──────────────┼──────────────────────┼──────────────┼──────────────┼──────────────┼──────────┤
  │ MAD          │ Madrid               │ $89.00       │ 2025-08-01   │ 2025-08-08   │ ✓ check  │
  │ BCN          │ Barcelona            │ $95.00       │ 2025-08-03   │ 2025-08-10   │ ✓ check  │
  └──────────────┴──────────────────────┴──────────────┴──────────────┴──────────────┴──────────┘
```

---

## Notes

- Uses the **Amadeus test API** by default — prices are realistic but may differ slightly from live fares.
- Switch to the production API by changing `BASE_URL` in `src/amadeus.js` once your app is approved.
- The luggage filter uses checked bag data from the API; when not available it shows `check` and you should confirm with the airline.
