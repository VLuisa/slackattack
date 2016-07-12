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
function searchYelp(food, convo) {
  yelp.search({ term: food, location: 'Chicago', limit: 2, sort: 2 })
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


// See http://www.yelp.com/developers/documentation/v2/business
// yelp.business('yelp-san-francisco')
//   .then(console.log)
//   .catch(console.error);
//
// yelp.phoneSearch({ phone: '+15555555555' })
//   .then(console.log)
//   .catch(console.error);

  // A callback based API is also available:
// yelp.business('yelp-san-francisco', function(err, data) {
//   if (err) return console.log(error);
//   console.log(data);
// });
