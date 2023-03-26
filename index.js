import http from 'http';
import SlackBolt from '@slack/bolt';
// import { SocketModeClient } from '@slack/socket-mode';
import axios from 'axios';
import { Configuration, OpenAIApi } from 'openai';
import random from 'random';
const { App } = SlackBolt;

// Set up your OpenAI API key
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Set up your Slack bot token and app token
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN;

// Initialize the Slack app
const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_APP_SIGNING_SECRET,
  appToken: SLACK_APP_TOKEN,
  socketMode: true,
});

// const client = new SocketModeClient({
//   appToken: SLACK_APP_TOKEN,
//   socketMode: true,
// });

async function get_related_gif(query) {
  const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
  const giphy_url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=1`;
  const response = await axios.get(giphy_url);

  if (response.status === 200) {
    const data = response.data;
    if (data.data && data.data.length > 0) {
      return data.data[0].images.downsized.url;
    }
  }

  return null;
}

app.event('app_mention', async ({ body, say, ack }) => {
  console.log('Received mention event', body.event);
  await ack();
  const text = body.event.text;
  const user = body.event.user;

  if (!text || !user) {
    return;
  }

  // Add a GIF 15% of the time
  let gif_url = '';
  if (random.float() < 0.15) {
    const regex = /<.*?>/g;
    const result = text.replace(regex, '');
    gif_url = await get_related_gif(result);
  }

  if (gif_url) {
    // Send the ChatGPT response with a GIF
    await say({
      // channel: body.event.channel,
      blocks: [
        {
          type: 'image',
          title: { type: 'plain_text', text: 'Related GIF' },
          image_url: gif_url,
          alt_text: 'Related GIF',
        },
      ],
    });
  } else {
    // Call OpenAI API to get ChatGPT's response
    let prompt = `Respond to this text "${text}" as if you are an edgy 18-year-old boy who tends to use teenage chat lingo. `

    if (random.float() < 0.3) prompt += `Use emojis. `
    if (random.float() < 0.1) prompt += `Be very suggestive with your language. `
    if (random.float() < 0.2) prompt += `Seem doubtful about what was said. `
    if (random.float() < 0.1) prompt += `Give a very serious response, and relate it to an incident that happened to you in the past. `
    if (random.float() < 0.1) prompt += `Tell me you'd rather be playing a certain video game instead of having this conversation. `
    if (random.float() < 0.5) prompt += `Respond with 1 or 2 paragraphs. `

    try {
      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: Math.random() + 0.5, // rand betwen 0.5 and 1.5 (out of 2)
        stream: false,
      });
      const chatgpt_response = response?.data?.choices[0].message?.content;
      // Send the ChatGPT response without a GIF
      await say(chatgpt_response);
    } catch (error) {
      console.error('ERR:', error);
    }
  }
});

(async () => {
  // Start the app
  await app.start();
  console.log('App started');
})();

http.createServer(function(req, res) {
  console.log(`Just got a request at ${req.url}!`);
  res.write('Yo!');
  res.end();
}).listen(process.env.PORT || 3000);
