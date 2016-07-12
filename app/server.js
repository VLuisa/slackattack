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

controller.hears(['hungry', 'food'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  function askIfHungry(response, convo) {
    convo.ask('Are you hungry?', [
      {
        pattern: bot.utterances.yes,
        callback: () => {
          convo.say('I can help with that!');
          askFoodType(response, convo);
          convo.next();
        },
      },
      {
        pattern: bot.utterances.no,
        callback: () => {
          convo.say('Ok maybe later then.');
          convo.next();
        },
      },
      {
        default: true,
        callback: () => {
          convo.repeat();
          convo.next();
        },
      },
    ]);
  }

  function askFoodType(response, convo) {
    convo.ask('What type of food are you in the mood for?', (food) => {
      convo.say('Okay');
      askLocation(food, convo);
      convo.next();
    });
  }

  function askLocation(food, convo) {
    convo.ask('Where are you?', (location) => {
      convo.say(`So you want ${food.text} near ${location.text}`);
      searchYelp(food, location, convo);
      convo.next();
    });
  }
  // Adapted from https://github.com/olalonde/node-yelp
  // See http://www.yelp.com/developers/documentation/v2/search_api
  function searchYelp(food, location, convo) {
    yelp.search({ term: `${food.text}`, location: `${location.text}`, limit: 3, sort: 2 }) // sort by highest rating, limit 3 searches
    .then((data) => {
      if (data.businesses.length > 1) {
        data.businesses.forEach(business => {
          console.log(business.name);
          convo.say(business.name);
          // convo.say(business.rating);
        });
        convo.next();
      } else {
        convo.say('I couldn\'t find any results sorry');
      }
    })
    .catch((err) => {
      console.error(err);
    });
  }
  bot.startConversation(message, askIfHungry);
});

// Using attachments
controller.hears('another_keyword', 'direct_message,direct_mention', (bot, message) => {
  const attachment = {
    'username': 'My bot',
    'text': 'This is a pre-text',
    'attachments': [
      {
        'fallback': 'To be useful, I need you to invite me in a channel.',
        'title': 'How can I help you?',
        'text': 'To be useful, I need you to invite me in a channel ',
        'color': '#7CD197',
      },
    ],
    'icon_url': 'http://lorempixel.com/48/48',
  };

  bot.reply(message, attachment);
});


// to wake up luisa-bot
controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'yeah yeah i\'m up http://giphy.com/gifs/hello-adele-1GlKbuWu2TgDC');
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


// ATTACHMENT: https://github.com/howdyai/botkit/blob/master/examples/demo_bot.js


// // Conversation for Yelp API Conversation
// // Used https://github.com/howdyai/botkit/blob/master/readme.md#multi-message-replies-to-incoming-messages as a resource
// controller.hears(['hungry', 'food', 'lunch', 'dinner', 'breakfast'], ['direct_message', 'direct_mention', 'mention', 'message_received'], (bot, message) => {
//   bot.startConversation(message, (err, convo) => {
//     convo.ask('Oh are you hungry? What kind of food would you like?', (response, convo) => {
//     // convo.say('Ok I\'ll search yelp for: ' + response.text);
//       const yelpResult = searchYelp(response.text, convo);
//       const yelpResponse = `Here's what I found: ${yelpResult}`;
//       convo.say('test');
//       convo.say(yelpResponse);
//     // convo.say('Here\'s what I found' + yelp.search({ term: response.text, location: 'Chicago' }));
//       // convo.next();
//     });
//   });
// });

// Lists what the robot can do
controller.hears('help', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'As of now if you tell me you\'re hungry or want food I can help you find options near you');
});

// Default message; should go last so it doesn't always say this
controller.hears('', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'What are you even talking about');
  bot.reply(message, 'Fine... If you need help type help');
});
