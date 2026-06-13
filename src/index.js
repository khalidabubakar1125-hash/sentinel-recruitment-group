#!/usr/bin/env node
import 'dotenv/config';
import { program } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import { searchCheapestDestinations, getFlightOffersForRoute, getAirportsByKeyword } from './amadeus.js';
import { printBanner, printDestinationTable, printFlightOffersTable, printError } from './display.js';

function getCredentials() {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    printError(
      'Missing Amadeus API credentials.\n' +
      '  1. Sign up free at https://developers.amadeus.com\n' +
      '  2. Copy .env.example to .env\n' +
      '  3. Add your AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET'
    );
    process.exit(1);
  }
  return { clientId, clientSecret };
}

// --- explore command: find cheapest destinations from an origin ---
program
  .command('explore')
  .description('Find the cheapest destinations worldwide from your airport')
  .option('-o, --origin <IATA>', 'Origin airport/city code (e.g. LHR, JFK, DXB)')
  .option('-d, --date <YYYY-MM>', 'Travel month (e.g. 2025-08)')
  .option('-p, --max-price <number>', 'Maximum price in USD', parseFloat)
  .option('-c, --currency <code>', 'Currency code', 'USD')
  .option('--one-way', 'Search one-way fares only')
  .action(async (opts) => {
    printBanner();
    const creds = getCredentials();

    const answers = await promptMissing(opts);
    const origin = (opts.origin || answers.origin).toUpperCase();
    const departureDate = opts.date || answers.date;
    const maxPrice = opts.maxPrice || answers.maxPrice;
    const currency = opts.currency;

    const spinner = ora(`Searching cheapest destinations from ${origin}...`).start();
    try {
      const destinations = await searchCheapestDestinations({
        ...creds,
        origin,
        departureDate,
        maxPrice: maxPrice || undefined,
        currency,
        oneWay: opts.oneWay,
      });
      spinner.stop();
      console.log(chalk.bold(`\n  Cheapest destinations from ${chalk.cyan(origin)}:`));
      printDestinationTable(destinations, currency);
      console.log(chalk.dim('  Tip: Run `flights search` to drill into a specific route with bag details.\n'));
    } catch (err) {
      spinner.fail('Search failed');
      printError(err.response?.data?.errors?.[0]?.detail || err.message);
    }
  });

// --- search command: search specific route with bag filter ---
program
  .command('search')
  .description('Search flights on a specific route, filtered by luggage allowance')
  .option('-o, --origin <IATA>', 'Origin airport code (e.g. LHR)')
  .option('-D, --destination <IATA>', 'Destination airport code (e.g. BKK)')
  .option('-d, --date <YYYY-MM-DD>', 'Departure date')
  .option('-r, --return-date <YYYY-MM-DD>', 'Return date (omit for one-way)')
  .option('-a, --adults <n>', 'Number of adult passengers', parseInt, 1)
  .option('-p, --max-price <number>', 'Maximum total price', parseFloat)
  .option('-b, --min-bags <kg>', 'Minimum checked baggage in kg', parseInt, 10)
  .option('-c, --currency <code>', 'Currency code', 'USD')
  .option('--non-stop', 'Direct flights only')
  .action(async (opts) => {
    printBanner();
    const creds = getCredentials();

    const answers = await promptSearchMissing(opts);
    const origin = (opts.origin || answers.origin).toUpperCase();
    const destination = (opts.destination || answers.destination).toUpperCase();
    const departureDate = opts.date || answers.date;
    const returnDate = opts.returnDate || answers.returnDate || null;
    const minBags = opts.minBags ?? 10;
    const currency = opts.currency;

    const spinner = ora(`Searching ${origin} → ${destination} on ${departureDate}...`).start();
    try {
      const offers = await getFlightOffersForRoute({
        ...creds,
        origin,
        destination,
        departureDate,
        returnDate: returnDate || undefined,
        adults: opts.adults,
        currency,
        nonStop: opts.nonStop,
        maxPrice: opts.maxPrice || undefined,
      });
      spinner.stop();
      console.log(chalk.bold(`\n  Flights ${chalk.cyan(origin)} → ${chalk.cyan(destination)} — min. ${chalk.green(minBags + 'kg')} luggage:\n`));
      printFlightOffersTable(offers, currency, minBags);
    } catch (err) {
      spinner.fail('Search failed');
      printError(err.response?.data?.errors?.[0]?.detail || err.message);
    }
  });

// --- lookup command: find airport codes ---
program
  .command('airport <keyword>')
  .description('Look up airport/city IATA codes by name')
  .action(async (keyword) => {
    const creds = getCredentials();
    const spinner = ora(`Looking up "${keyword}"...`).start();
    try {
      const results = await getAirportsByKeyword({ ...creds, keyword });
      spinner.stop();
      if (!results.length) { console.log(chalk.yellow('No results found.')); return; }
      console.log(chalk.bold(`\n  Airports/cities matching "${keyword}":\n`));
      for (const loc of results) {
        const type = loc.subType === 'AIRPORT' ? chalk.blue('[Airport]') : chalk.magenta('[City]  ');
        console.log(`  ${chalk.cyan.bold(loc.iataCode)}  ${type}  ${loc.name}, ${loc.address?.countryCode}`);
      }
      console.log();
    } catch (err) {
      spinner.fail('Lookup failed');
      printError(err.response?.data?.errors?.[0]?.detail || err.message);
    }
  });

// --- interactive mode when no command given ---
program
  .action(async () => {
    printBanner();
    const creds = getCredentials();

    const { mode } = await inquirer.prompt([{
      type: 'list',
      name: 'mode',
      message: 'What would you like to do?',
      choices: [
        { name: '🌍  Explore cheapest destinations from my airport', value: 'explore' },
        { name: '✈️   Search flights on a specific route', value: 'search' },
        { name: '🔍  Look up an airport code', value: 'airport' },
      ],
    }]);

    if (mode === 'airport') {
      const { keyword } = await inquirer.prompt([{ type: 'input', name: 'keyword', message: 'Enter city or airport name:' }]);
      const spinner = ora('Searching...').start();
      const results = await getAirportsByKeyword({ ...creds, keyword });
      spinner.stop();
      for (const loc of results) {
        const type = loc.subType === 'AIRPORT' ? chalk.blue('[Airport]') : chalk.magenta('[City]  ');
        console.log(`  ${chalk.cyan.bold(loc.iataCode)}  ${type}  ${loc.name}, ${loc.address?.countryCode}`);
      }
      return;
    }

    const commonAnswers = await inquirer.prompt([
      { type: 'input', name: 'origin', message: 'Your departure airport code (e.g. LHR, JFK, DXB):', validate: v => v.length >= 2 || 'Enter a valid code' },
      { type: 'input', name: 'date', message: mode === 'explore' ? 'Travel month (YYYY-MM):' : 'Departure date (YYYY-MM-DD):', validate: v => v.length >= 4 || 'Required' },
      { type: 'number', name: 'maxPrice', message: 'Max price in USD (press Enter to skip):', default: 0 },
    ]);

    if (mode === 'explore') {
      const spinner = ora(`Exploring destinations from ${commonAnswers.origin.toUpperCase()}...`).start();
      try {
        const destinations = await searchCheapestDestinations({
          ...creds,
          origin: commonAnswers.origin.toUpperCase(),
          departureDate: commonAnswers.date,
          maxPrice: commonAnswers.maxPrice || undefined,
          currency: 'USD',
        });
        spinner.stop();
        printDestinationTable(destinations, 'USD');
        console.log(chalk.dim('  Tip: Run `flights search` to drill into a specific route with bag details.\n'));
      } catch (err) {
        spinner.fail('Failed');
        printError(err.response?.data?.errors?.[0]?.detail || err.message);
      }
    } else {
      const routeAnswers = await inquirer.prompt([
        { type: 'input', name: 'destination', message: 'Destination airport code:', validate: v => v.length >= 2 || 'Required' },
        { type: 'input', name: 'returnDate', message: 'Return date (YYYY-MM-DD, leave blank for one-way):' },
        { type: 'number', name: 'minBags', message: 'Minimum checked baggage (kg):', default: 10 },
        { type: 'confirm', name: 'nonStop', message: 'Direct flights only?', default: false },
      ]);

      const spinner = ora(`Searching ${commonAnswers.origin.toUpperCase()} → ${routeAnswers.destination.toUpperCase()}...`).start();
      try {
        const offers = await getFlightOffersForRoute({
          ...creds,
          origin: commonAnswers.origin.toUpperCase(),
          destination: routeAnswers.destination.toUpperCase(),
          departureDate: commonAnswers.date,
          returnDate: routeAnswers.returnDate || undefined,
          adults: 1,
          currency: 'USD',
          nonStop: routeAnswers.nonStop,
          maxPrice: commonAnswers.maxPrice || undefined,
        });
        spinner.stop();
        printFlightOffersTable(offers, 'USD', routeAnswers.minBags);
      } catch (err) {
        spinner.fail('Failed');
        printError(err.response?.data?.errors?.[0]?.detail || err.message);
      }
    }
  });

async function promptMissing(opts) {
  const questions = [];
  if (!opts.origin) questions.push({ type: 'input', name: 'origin', message: 'Your departure airport code (e.g. LHR, JFK, DXB):', validate: v => v.length >= 2 || 'Required' });
  if (!opts.date) questions.push({ type: 'input', name: 'date', message: 'Travel month (YYYY-MM):', validate: v => /^\d{4}-\d{2}$/.test(v) || 'Format: YYYY-MM' });
  if (!opts.maxPrice) questions.push({ type: 'number', name: 'maxPrice', message: 'Max price in USD (0 = no limit):', default: 0 });
  return questions.length ? inquirer.prompt(questions) : {};
}

async function promptSearchMissing(opts) {
  const questions = [];
  if (!opts.origin) questions.push({ type: 'input', name: 'origin', message: 'Origin airport code:', validate: v => v.length >= 2 || 'Required' });
  if (!opts.destination) questions.push({ type: 'input', name: 'destination', message: 'Destination airport code:', validate: v => v.length >= 2 || 'Required' });
  if (!opts.date) questions.push({ type: 'input', name: 'date', message: 'Departure date (YYYY-MM-DD):', validate: v => /^\d{4}-\d{2}-\d{2}$/.test(v) || 'Format: YYYY-MM-DD' });
  if (!opts.returnDate) questions.push({ type: 'input', name: 'returnDate', message: 'Return date (YYYY-MM-DD, leave blank for one-way):' });
  return questions.length ? inquirer.prompt(questions) : {};
}

program.parse();
