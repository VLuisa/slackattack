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
    // yelp.search({ term: `${food.text}`, location: `${location.text}`, limit: 3, sort: 2 }) // sort by highest rating, limit 3 searches
    yelp.search({ term: 'pizza', location: 'Chicago', limit: 3, sort: 2 }) // sort by highest rating, limit 3 searches

    .then((data) => {
      if (data.businesses.length > 1) {
        data.businesses.forEach(business => {
          convo.say(business.name.text);
        });
        // convo.next();
      } else {
        convo.say('I couldn\'t find any results sorry');
      }
    })
    .catch((err) => {
      convo.say('Hmm that didn\'t work some reason');
      convo.next();
      console.error(err);
    });
  }
  bot.startConversation(message, askIfHungry);
});

// Using attachments
// ATTACHMENT source: https://github.com/howdyai/botkit/blob/master/examples/demo_bot.js
controller.hears(['color', 'colorpicker', 'find color'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  const attachment = {
    'username': 'My bot',
    'text': 'Looking for a quick link to a colorpicker? Here you go :)',
    'attachments': [
      {
        'fallback': 'To be useful, I need you to invite me in a channel.',
        'title': 'How can I help you?',
        'text': 'This is my favorite color #ff7575, and my favorite color-picker website: http://htmlcolorcodes.com/color-picker/',
        'color': '#ff7575',
      },
    ],
    'icon_url': 'https://color.adobe.com/build2.0.0-buildNo/resource/img/kuler/color_wheel_730.png',
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

// Ask about art and explore
// Adapted from: https://github.com/howdyai/botkit
controller.hears(['art', 'explore', 'discover'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.startConversation(message, (err, convo) => {
    convo.say('Would you like to explore some art? I have some suggestions for great websites if you\'re interested');
    convo.ask('Shall we proceed Say YES, NO or favorite to hear about my favorite art piece', [
      {
        pattern: 'favorite',
        callback: () => {
          convo.say('This is my favorite work of art: https://upload.wikimedia.org/wikipedia/commons/b/b1/Claude_Monet_-_Twilight,_Venice.jpg');
          convo.say('I\'m a big fan of Monet');
          convo.next();
        },
      },
      {
        pattern: bot.utterances.yes,
        callback: () => {
          convo.say('This isn\'t classic art or master works but a great place for people to share what they\'re working on these days: https://www.behance.net/');
          convo.say('or https://dribbble.com/');
          convo.next();
        },
      },
      {
        pattern: bot.utterances.no,
        callback: () => {
          convo.say(':\'( Perhaps later...');
          convo.next();
        },
      },
      {
        default: true,
        callback: () => {
          // just repeat the question
          convo.repeat();
          convo.next();
        },
      },
    ]);
  });
});

// Lists what the robot can do
controller.hears('help', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'As of now if you tell me you\'re hungry or want food I can help you find options near you, also if you need a color picker website I can point you to my favorite one, just mention the word "color", and if you want to explore some cool web developers or illustrators check out Behance or Dribbble and prompt me with "explore" or "art" and I\'ll send you my favorite painting');
});

// Default message; should go last so it doesn't always say this
controller.hears('', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'What are you even talking about');
  bot.reply(message, 'Fine... If you need help type help');
});
