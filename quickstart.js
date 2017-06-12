var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Calendar API.
  authorize(JSON.parse(content), function (auth) {

  });
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function determineLocation(auth, emailAddress, date = new Date()) {
    console.log("Determining the location of '%s'", emailAddress);

    listEvents(auth, emailAddress, date, function(events) {
        var eventCurrentlyGoingOn;
        var upcomingEvent;
        events.forEach(function(singleEvent){
            var startDate = new Date(singleEvent.start.dateTime || singleEvent.start.date);
            var endDate = new Date(singleEvent.end.dateTime || singleEvent.end.date);

            if (singleEvent.start.date && !singleEvent.start.dateTime) {
                // The event is an all-day event. Ignore those for now.
                console.info('Ignoring all-day event "%s"', singleEvent.summary);
                return;
            }

            if (startDate < date && endDate > date) {
                // This event is currently going on.
                eventCurrentlyGoingOn = singleEvent;
            } else if (startDate > date) {
                // This is an upcoming event.
                upcomingEvent = singleEvent;
            }
        });

        if (eventCurrentlyGoingOn) {
            console.info("❌  Not available");
            var location = eventCurrentlyGoingOn.location || "(not specified)";
            console.log("  Summary: %s", eventCurrentlyGoingOn.summary);
            console.log("  Location: %s", location);
        } else if (upcomingEvent) {
            var startDate = new Date(upcomingEvent.start.dateTime || upcomingEvent.start.date);

            console.log("⏳  Will attend '%s' at %s", upcomingEvent.summary, startDate);
        } else {
            console.log("✅  They are available");
        }
    });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth, calendarId, date, cb) {
    var numberOfMinutesToSearch = 5;
    var fiveMinutesEarlier = new Date(date.getTime() - numberOfMinutesToSearch*60000);
    var fiveMinutesLater = new Date(date.getTime() + numberOfMinutesToSearch*60000);

  var calendar = google.calendar('v3');
  calendar.events.list({
    auth: auth,
    calendarId: calendarId,
    timeMin: fiveMinutesEarlier.toISOString(),
    timeMax: fiveMinutesLater.toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
  }

  cb(response.items || []);
  });
}
