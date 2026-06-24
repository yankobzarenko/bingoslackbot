const zipcodes = require("zipcodes");
const axios = require("axios");
require("dotenv").config();

const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

app.command("/bingo-help", async ({ ack, respond }) => {
  await ack();
  await respond({
    text:
`Here's what you can ask me to do:
/bingo-ping - Check Bingo's latency
/bingo-catfact - Ask Bingo for a random cat fact
/bingo-forecast - Ask Bingo about the weather
/bingo-colorpallete - Ask Bingo for a color pallete
/bingo-joke - Ask Bingo for a random joke
/bingo-timezone - Ask Bingo to convert timezones for you`
  });
});

app.command("/bingo-ping", async ({ command, ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `Pong!\nLatency: ${latency}ms` });
});

app.command("/bingo-catfact", async ({ ack, respond }) => {
  await ack();

  try {
    const response = await axios.get("https://catfact.ninja/fact");
    await respond({ text: `Here's something I found:\n${response.data.fact}` });
  } catch (err) {
    await respond({ text: "Sorry, I couldn't fetch a cat fact at the moment." });
  }
});

app.command("/bingo-joke", async ({ ack, respond }) => {
  await ack();

  try {
    const response = await axios.get("https://official-joke-api.appspot.com/random_joke");
    await respond({
      text:
`${response.data.setup}

${response.data.punchline}`
    });
  } catch (err) {
    await respond({ text: "Sorry, I couldn't fetch a joke at the moment." });
  }
});

app.command("/bingo-forecast", async ({ ack, respond, body }) => {
  await ack();

  const weathercode = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };

  try {
    const zipcode = (body.text || "").trim();

    if (!zipcode) {
      await respond({ text: "I'm sorry, but I need a zipcode to provide a weather forecast." });
      return;
    }

    const location = zipcodes.lookup(zipcode);

    if (!location) {
      await respond({ text: "Uh oh! I couldn't find that zipcode." });
      return;
    }

    const lat = location.latitude;
    const lon = location.longitude;

    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: lat,
        longitude: lon,
        hourly: "temperature_2m,weathercode",
        timezone: "auto"
      }
    });

    const code = response.data.hourly.weathercode[0];
    const weather = weathercode[code] ?? "Unknown weather condition";

    await respond({
      text: `In ${location.city}, ${location.state}, today's weather is as follows:\nTemperature: ${response.data.hourly.temperature_2m[0]}°C\nWeather: ${weather}`
    });

  } catch (err) {
    await respond({ text: `Sorry, I couldn't fetch the weather forecast at the moment.` });
  }
});

app.command("/bingo-colorpallete", async ({ ack, respond, body }) => {
  await ack();

  const search = (body.text || "").trim();

  if (!search) {
    await respond({ text: "Please provide a search term to find color palettes." });
    return;
  }

  try {
    const response = await axios.get(`https://colormagic.app/api/palette/search?q=${search}`);
    const palletes = response.data.slice(0, 5); // Limit to 5 palettes

    const blocks = [];

    blocks.push({
      type: "header",
      text: {
        type: "plain_text",
        text: `Color Palettes for "${search}"`,
        emoji: true
      }
    });

    palletes.forEach((palette, i) => {
      if (i > 0) {
        blocks.push({ type: "divider" });
      }

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${palette.text}*`
        }
      });

      const colorBlocks = palette.colors
        .map((hex) => `\`${hex}\``)
        .join("  ");

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: colorBlocks
        }
      });

      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `${palette.tags.join(", ")}`
          }
        ]
      });

      const chart = {
        type: "bar",
        data: {
          labels: palette.colors,
          datasets: [{
            data: palette.colors.map(() => 1),
            backgroundColor: palette.colors
          }]
        },
        options: {
          legend: { display: false },
          scales: {
            x: { display: false },
            y: { display: false }
          }
        }
      }
    });

    await respond({ blocks });
  } catch (err) {
    await respond({ text: `Sorry, I couldn't fetch a color palette at the moment. Error: ${err.message}` });
  }
});

app.command("/bingo-timezone", async ({ ack, respond, body }) => {
  await ack();

  try {
    const currenttime = new Date();
    const targettimezone = (body.text || "").trim();

    if (!targettimezone) {
      await respond({ text: "Please provide a timezone to convert the current time." });
      return;
    }

    const conversion = currenttime.toLocaleString("en-US", { 
      timeZone: targettimezone,
      dateStyle: "full",
      timeStyle: "long"
    });

    await respond({
      text: `The current time in ${targettimezone} is:\n${conversion}`
    });

  } catch (err) {
    await respond({ text: "Sorry, I couldn't convert the timezone at the moment." });
  }
});

(async () => {
  await app.start();
  console.log("Ready to help!");
})();
