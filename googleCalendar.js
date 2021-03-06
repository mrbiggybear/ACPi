const fs = require("fs");
const readline = require("readline");
const {google} = require("googleapis");

// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = "token.json";

let todaysEvents = {};

// Load client secrets from a local file.
fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    // Authorize a client with credentials, then call the Google Calendar API.
    authorize(JSON.parse(content.toString()), listDaysEvents);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
    });
    console.log("Authorize this app by visiting this url:", authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question("Enter the code from that page here: ", (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error("Error retrieving access token", err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log("Token stored to", TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

function refreshEvents() {
    // Load client secrets from a local file.
    console.log("Getting Current Events...");
    fs.readFile("credentials.json", (err, content) => {
        if (err) return console.log("Error loading client secret file:", err);
        // Authorize a client with credentials, then call the Google Calendar API.
        authorize(JSON.parse(content.toString()), listDaysEvents);
    });
}

/**
 * Lists the current days events on the calendarId's calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listDaysEvents(auth) {
    const calendar = google.calendar({version: "v3", auth});

    // Sets the timeMin to the Beginning of Day
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    // Sets the timeMax to the End of Day
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    calendar.events.list({
        calendarId: "f7aitb2eic2pu3beupp071ql00@group.calendar.google.com",
        timeMin: start.toISOString(),
        timeMax: end.toISOString()
    }, (err, res) => {
        if (err) return console.log("The API returned an error: " + err);
        const events = res.data.items;
        if (events.length) {
            events.forEach(event => {
                const start = event.start.dateTime || event.start.date;
                const end = event.end.dateTime || event.end.date;
                todaysEvents[event.summary] = {
                    start: start,
                    end: end,
                    description: event.description
                }
            });
        } else {
            console.log("No upcoming events found.");
        }
    });
}

module.exports.refreshEvents = () => refreshEvents();
module.exports.todaysEvents = todaysEvents;