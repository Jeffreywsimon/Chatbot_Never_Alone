'use strict';

<<<<<<< HEAD
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

=======
require('dotenv').config();


const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express().use(bodyParser.json()); // Creates an HTTP server with JSON parsing

const token = 'VERIFICATION_TOKEN'; // Replace with your actual verification token
const API_KEY = 'your-api-key';
const API_SECRET = 'your-api-secret';
const FORM_ID = 'your-form-id'; // Replace with your actual CTM form ID

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
app.post('/', async (req, res) => {
    console.log('--- Incoming Webhook from Chatbot.com ---');
    console.log(JSON.stringify(req.body, null, 2));

    const webhookPayload = req.body;

    try {
        // Extract fields from the webhook payload
        const uniqueFormId = webhookPayload.userId;
        const callerName = webhookPayload.userAttributes.default_name;
        const email = webhookPayload.userAttributes.default_email;
        const phoneNumber = webhookPayload.userAttributes.default_phone_number;

        // Custom fields mapping
        const customFields = {
            custom_birthdate: webhookPayload.attributes.Birthdate || '',
            custom_insurance_number: webhookPayload.attributes.InsuranceNumber || '',
            custom_group_number: webhookPayload.attributes.GroupNumber || '',
            custom_additional_notes: webhookPayload.attributes.AdditionalNotes || ''
        };

        // Forming the payload for the CTM API
        const ctmPayload = {
            phone_number: phoneNumber,
            caller_name: callerName,
            email: email,
            type: 'API',
            unique_form_id: uniqueFormId,
            custom_fields: customFields
        };

        // Making the POST request to CTM API
        const response = await axios.post(
            `https://api.calltrackingmetrics.com/api/v1/formreactor/${FORM_ID}`,
            ctmPayload,
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('CTM API Response:', response.data);

        // Prepare a response for Chatbot.com (optional)
        const data = {
            responses: [
                {
                    type: 'randomText',
                    messages: ['Thank you!', 'Data received and processed successfully!']
                }
            ]
        };

        // Return the expected response to Chatbot.com
        res.status(200).json(data);

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

>>>>>>> 8458de2 (Remove .env from Git tracking)
// Start the server (must be the last line in the file)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[ChatBot] Webhook is listening on port ${PORT}`));
