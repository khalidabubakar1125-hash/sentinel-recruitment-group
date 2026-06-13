import chalk from 'chalk';
import Table from 'cli-table3';

export function printBanner() {
  console.log(chalk.bold.cyan('\n✈  Cheap Flight Finder'));
  console.log(chalk.dim('   Find the best deals worldwide with luggage included\n'));
}

export function printDestinationTable(destinations, currency) {
  if (!destinations.length) {
    console.log(chalk.yellow('No destinations found for your criteria.'));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('Destination'),
      chalk.bold('City'),
      chalk.bold(`Price (${currency})`),
      chalk.bold('Depart'),
      chalk.bold('Return'),
      chalk.bold('Bags'),
    ],
    colWidths: [14, 22, 14, 14, 14, 10],
    style: { head: [], border: ['grey'] },
  });

  for (const d of destinations) {
    const bagsInfo = d.links?.flightOffers ? chalk.green('✓ check') : chalk.dim('varies');
    table.push([
      chalk.cyan(d.destination),
      chalk.white(d.cityName || '-'),
      chalk.green.bold(`$${parseFloat(d.price?.total || 0).toFixed(2)}`),
      d.departureDate || '-',
      d.returnDate || '-',
      bagsInfo,
    ]);
  }

  console.log(table.toString());
  console.log(chalk.dim(`\n  ${destinations.length} destination(s) found\n`));
}

export function printFlightOffersTable(offers, currency, minBaggageKg = 10) {
  if (!offers.length) {
    console.log(chalk.yellow('No flight offers found.'));
    return;
  }

  const filtered = offers.filter(o => {
    const bags = extractBaggageKg(o);
    return bags === null || bags >= minBaggageKg;
  });

  if (!filtered.length) {
    console.log(chalk.yellow(`No flights found with at least ${minBaggageKg}kg luggage.`));
    console.log(chalk.dim(`  (${offers.length} flights found before luggage filter)\n`));
    return;
  }

  const table = new Table({
    head: [
      chalk.bold('#'),
      chalk.bold('Airline'),
      chalk.bold('Route'),
      chalk.bold('Stops'),
      chalk.bold('Depart'),
      chalk.bold('Arrive'),
      chalk.bold('Duration'),
      chalk.bold(`Price (${currency})`),
      chalk.bold('Bags'),
    ],
    colWidths: [4, 10, 16, 7, 14, 14, 11, 14, 12],
    style: { head: [], border: ['grey'] },
  });

  filtered.slice(0, 20).forEach((offer, i) => {
    const seg = offer.itineraries?.[0]?.segments?.[0];
    const lastSeg = offer.itineraries?.[0]?.segments?.at(-1);
    const stops = (offer.itineraries?.[0]?.segments?.length || 1) - 1;
    const bags = extractBaggageKg(offer);
    const bagsLabel = bags !== null ? chalk.green(`${bags}kg`) : chalk.dim('check');

    table.push([
      chalk.dim(i + 1),
      chalk.cyan(seg?.carrierCode || '-'),
      `${seg?.departure?.iataCode || '?'} → ${lastSeg?.arrival?.iataCode || '?'}`,
      stops === 0 ? chalk.green('Direct') : chalk.yellow(`${stops} stop`),
      formatDateTime(seg?.departure?.at),
      formatDateTime(lastSeg?.arrival?.at),
      formatDuration(offer.itineraries?.[0]?.duration),
      chalk.green.bold(`$${parseFloat(offer.price?.grandTotal || 0).toFixed(2)}`),
      bagsLabel,
    ]);
  });

  console.log(table.toString());
  console.log(chalk.dim(`\n  ${filtered.length} offer(s) with ${minBaggageKg}kg+ luggage (of ${offers.length} total)\n`));
}

function extractBaggageKg(offer) {
  const travelerPricings = offer.travelerPricings?.[0];
  const fareDetails = travelerPricings?.fareDetailsBySegment?.[0];
  const checkedBags = fareDetails?.includedCheckedBags;

  if (!checkedBags) return null;
  if (checkedBags.weight) return checkedBags.weight;
  // Estimate: 1 bag ≈ 20–23kg; 2 bags ≈ 40kg
  if (checkedBags.quantity) return checkedBags.quantity * 20;
  return null;
}

function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatDuration(iso) {
  if (!iso) return '-';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const h = match[1] || '0';
  const m = match[2] || '00';
  return `${h}h ${m}m`;
}

export function printError(msg) {
  console.error(chalk.red(`\n  Error: ${msg}\n`));
}
