'use strict';

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json()); // Creates an HTTP server with JSON parsing
const token = 'VERIFICATION_TOKEN'; // Replace with your actual verification token

const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const FORM_ID = process.env.FORM_ID; // Ensure this is set in Heroku env variables

const qs = require('querystring'); // Required for x-www-form-urlencoded format

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

    // ✅ Process CTM request in the background
    setTimeout(async () => {
        try {
            const webhookPayload = req.body;
            const uniqueFormId = webhookPayload.userId;
            const callerName = webhookPayload.userAttributes?.default_name || 'Unknown';
            const email = webhookPayload.userAttributes?.default_email || 'Unknown';
            const phoneNumber = webhookPayload.userAttributes?.default_phone_number || '';

            const customFields = {
                "custom_birthdate": webhookPayload.attributes?.Birthdate || '',
                "custom_insurance_number": webhookPayload.attributes?.InsuranceNumber || '',
                "custom_group_number": webhookPayload.attributes?.GroupNumber || '',
                "custom_additional_notes": webhookPayload.attributes?.AdditionalNotes || ''
            };

            // ✅ Convert to x-www-form-urlencoded format
            const formData = new URLSearchParams();
            formData.append("phone_number", phoneNumber);
            formData.append("caller_name", callerName);
            formData.append("email", email);
            formData.append("unique_form_id", uniqueFormId);

            // Append custom fields
            Object.entries(customFields).forEach(([key, value]) => {
                formData.append(key, value);
            });

            console.log('Sending data to CTM:', Object.fromEntries(formData));

            const response = await axios.post(
                `https://api.calltrackingmetrics.com/api/v1/formreactor/FRT472ABB2C5B9B141A72DE8F1EAEC5B9284C088CEE14C9508CC5042B2031EDFA12`,
                formData,
                {
                    headers: {
                        'Authorization': `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            console.log('✅ CTM API Response:', response.data);

        } catch (error) {
            console.error('❌ Error processing CTM API request:', error.response?.data || error.message);
        }
    }, 0); // Run immediately after response

});

// ✅ Fetch Available Fields from CTM (Debugging)
app.get('/debug-ctm-fields', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.calltrackingmetrics.com/api/v1/formreactor/FRT472ABB2C5B9B141A72DE8F1EAEC5B9284C088CEE14C9508CC5042B2031EDFA12`,
            {
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')}`,
                    'Accept': 'application/x-www-form-urlencoded'
                }
            }
        );

        console.log('CTM Form Reactor Details:', response.data);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching form details:', error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
});

// Start the server (must be the last line in the file)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[ChatBot] Webhook is listening on port ${PORT}`));
