'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json()); // Creates an HTTP server with JSON parsing
const token = 'VERIFICATION_TOKEN'; // Replace with your actual verification token

// Webhook verification (GET request)
app.get('/', (req, res) => {
  // Verify the token
  if (req.query.token !== token) {
    return res.sendStatus(401); // Unauthorized
  }

  // Return the challenge to confirm the webhook
  console.log(`Verification successful. Responding with challenge: ${req.query.challenge}`);
  return res.end(req.query.challenge); // Plain text response with the challenge value
});

// Webhook data handling (POST request)
app.post('/', (req, res) => {
  console.log('--- Incoming Webhook from Chatbot.com ---');
  console.log(JSON.stringify(req.body, null, 2));

  // Prepare a response (optional)
  const data = {
    responses: [
      {
        type: 'randomText',
        messages: ['Thank you!', 'Received successfully']
      }
    ]
  };

  // Return the expected response
  res.status(200).json(data);
});

// Start the server (must be the last line in the file)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[ChatBot] Webhook is listening on port ${PORT}`));
