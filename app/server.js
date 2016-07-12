// Request API access: http://www.yelp.com/developers/getting_started/api_access
const Yelp = require('yelp');

const yelp = new Yelp({
  consumer_key: process.env.YELP_CONSUMER_KEY,
  consumer_secret: process.env.YELP_CONSUMER_SECRET,
  token: process.env.YELP_TOKEN,
  token_secret: process.env.YELP_TOKEN_SECRET,
});

// example bot
import botkit from 'botkit';
console.log('starting bot');

// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
}).startRTM(err => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});


controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});

controller.hears('open the (.*) doors', ['direct_message', 'message_received'], (bot, message) => {
  const doorType = message.match[1]; // match[1] is the (.*) group. match[0] is the entire group (open the (.*) doors).
  if (doorType === 'pod bay') {
    return bot.reply(message, 'I\'m sorry, Dave. I\'m afraid I can\'t do that.');
  }
  return bot.reply(message, 'Okay');
});

// Adapted from https://github.com/olalonde/node-yelp
// See http://www.yelp.com/developers/documentation/v2/search_api
function searchYelp(food, place, convo) {
  yelp.search({ term: food, location: place, limit: 2, sort: 2 })
  .then((data) => {
    data.businesses.forEach(business => {
      console.log(business.name);
      convo.say(business.name);
      convo.next();
    });
    // return data.businesses.rating;

    // console.log(data.businesses[0].name);
    // console.log(data.total);
    // });
    // console.log(data.businesses[0].name);
  })
  .catch((err) => {
    console.error(err);
  });
}

// ATTACHMENT: https://github.com/howdyai/botkit/blob/master/examples/demo_bot.js


// Conversation for Yelp API Conversation
// Used https://github.com/howdyai/botkit/blob/master/readme.md#multi-message-replies-to-incoming-messages as a resource
controller.hears(['hungry', 'food', 'lunch', 'dinner', 'breakfast'], ['direct_message', 'direct_mention', 'mention', 'message_received'], (bot, message) => {
  bot.startConversation(message, (err, convo) => {
    convo.ask('Oh are you hungry? What kind of food would you like?', (response, convo) => {
    // convo.say('Ok I\'ll search yelp for: ' + response.text);
      const yelpResult = searchYelp(response.text, convo);
      const yelpResponse = `Here's what I found: ${yelpResult}`;
      convo.say('test');
      convo.say(yelpResponse);
    // convo.say('Here\'s what I found' + yelp.search({ term: response.text, location: 'Chicago' }));
      // convo.next();
    });
  });
});

// Lists what the robot can do
controller.hears('help', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'As of now if you tell me you\'re hungry or want food I can help you find options near you');
});

// Default message; should go last so it doesn't always say this
controller.hears('', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'What are you even talking about');
  bot.reply(message, 'Fine... If you need help type help');
});
