import axios from 'axios';

const BASE_URL = 'https://test.api.amadeus.com';

let tokenCache = null;

async function getToken(clientId, clientSecret) {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const res = await axios.post(
    `${BASE_URL}/v1/security/oauth2/token`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  tokenCache = {
    token: res.data.access_token,
    expiresAt: Date.now() + (res.data.expires_in - 60) * 1000,
  };
  return tokenCache.token;
}

export async function searchFlights({ clientId, clientSecret, origin, departureDate, adults = 1, maxPrice, currency = 'USD', nonStop = false }) {
  const token = await getToken(clientId, clientSecret);

  const params = {
    originLocationCode: origin,
    destinationLocationCode: 'NYC', // placeholder; we use flight-inspiration instead
    departureDate,
    adults,
    currencyCode: currency,
    nonStop,
    max: 50,
  };
  if (maxPrice) params.maxPrice = maxPrice;

  const res = await axios.get(`${BASE_URL}/v2/shopping/flight-offers`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return res.data.data || [];
}

export async function searchCheapestDestinations({ clientId, clientSecret, origin, departureDate, oneWay = false, duration, maxPrice, currency = 'USD', viewBy = 'DESTINATION' }) {
  const token = await getToken(clientId, clientSecret);

  const params = {
    origin,
    currencyCode: currency,
    viewBy,
  };
  if (departureDate) params.departureDate = departureDate;
  if (duration) params.duration = duration;
  if (maxPrice) params.maxPrice = maxPrice;
  if (oneWay) params.oneWay = true;

  const res = await axios.get(`${BASE_URL}/v1/shopping/flight-destinations`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return res.data.data || [];
}

export async function getFlightOffersForRoute({ clientId, clientSecret, origin, destination, departureDate, returnDate, adults = 1, currency = 'USD', nonStop = false, maxPrice }) {
  const token = await getToken(clientId, clientSecret);

  const params = {
    originLocationCode: origin,
    destinationLocationCode: destination,
    departureDate,
    adults,
    currencyCode: currency,
    nonStop,
    max: 20,
  };
  if (returnDate) params.returnDate = returnDate;
  if (maxPrice) params.maxPrice = maxPrice;

  const res = await axios.get(`${BASE_URL}/v2/shopping/flight-offers`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return res.data.data || [];
}

export async function getAirportsByKeyword({ clientId, clientSecret, keyword }) {
  const token = await getToken(clientId, clientSecret);
  const res = await axios.get(`${BASE_URL}/v1/reference-data/locations`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { keyword, subType: 'AIRPORT,CITY', view: 'LIGHT', page: { limit: 10 } },
  });
  return res.data.data || [];
}
