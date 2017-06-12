var slack = require('slack');

var bot = slack.rtm.client({
    token: token
});

// logs: ws, started, close, listen, etc... in addition to the RTM event handler methods

// do something with the rtm.start payload
bot.started(function(payload) {
  // console.log('payload from rtm.start', payload);
});

// respond to a user_typing message
bot.user_typing(function(msg) {
  console.log('several people are coding', msg);
});

bot.message(function(msg) {
  console.log('message received', msg);
  console.log(msg.text);
});

slack.users.info({token: token, user: ''}, function (err, data) {
    console.warn(err);
    console.info(data);
});

// start listening to the slack team associated to the token
bot.listen({token:token});
