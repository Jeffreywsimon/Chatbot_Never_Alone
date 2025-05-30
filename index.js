'use strict';

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();

// ✅ Enable CORS: Restrict API Access
app.use(cors({
    origin: "https://havendetoxnow.com", // ✅ Only allow this origin
    methods: "POST,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
}));

app.use(bodyParser.json());

// ✅ Rate Limiting: Prevent API Abuse (100 requests per 10 min per IP)
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // Max requests per IP per window
    message: "⚠️ Too many requests. Please try again later.",
});
app.use(limiter);

// ✅ Traffic Logging (Logs all API calls for monitoring)
app.use(morgan('combined'));

// ✅ Temporary storage for visitor SIDs (linked by CTM_Session_ID)
const visitorSessions = new Map();

const token = 'VERIFICATION_TOKEN'; // Replace with actual token
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

// ✅ Webhook verification (GET request)
app.get('/', (req, res) => {
    if (req.query.token !== token) {
        return res.sendStatus(401); // Unauthorized
    }
    console.log(`🔹 GET Request: Verification successful. Responding with challenge: ${req.query.challenge}`);
    return res.end(req.query.challenge);
});

// ✅ Pre-sync Visitor SID (Stores CTM_Session_ID)
app.post('/pre-sync-visitor', (req, res) => {
    console.log('--- Pre-syncing Visitor SID ---');

    const visitor_sid = req.body.visitor_sid || "unknown_sid";

    if (visitor_sid === "unknown_sid") {
        console.warn("⚠️ Missing visitor_sid in request.");
        return res.status(400).json({ error: "Missing visitor_sid" });
    }

    // ✅ Store visitor_sid
    visitorSessions.set("CTM_Session_ID", visitor_sid);
    console.log(`✅ Stored Visitor SID: ${visitor_sid} as CTM_Session_ID`);

    res.status(200).json({ message: "Visitor SID stored successfully." });
});

// ✅ Combined Webhook Handler - Accepts Data & Sends to CTM
app.post('/', async (req, res) => {
    console.log('--- Incoming Webhook from Chatbot.com ---');
    console.log(JSON.stringify(req.body, null, 2));

    // ✅ Retrieve the CTM_Session_ID from storage
    const visitor_sid = visitorSessions.get("CTM_Session_ID") || "unknown_sid";

    console.log(`📌 Processing Chatbot Data:`);
    console.log(`   - Retrieved Visitor SID (CTM_Session_ID): ${visitor_sid}`);

    // ✅ Retrieve the "isComplete" field from chatbot attributes
    let isComplete = req.body.attributes?.isComplete;

    if (typeof isComplete === 'undefined' || isComplete === null) {
        console.warn("⚠️ 'isComplete' field is missing or undefined.");
        isComplete = "no"; // Default to "no" if the field is missing
    }

    console.log(`📋 Form Completion Status (isComplete): ${isComplete}`);

    // ✅ Respond to Chatbot.com Webhook with visitor_sid
    res.status(200).json({
        attributes: {
            visitor_sid: visitor_sid,
            CTM_Session_ID: visitor_sid
        }
    });

    // ✅ Check isComplete status before sending data to CTM
    if (isComplete.toLowerCase().trim() !== "yes") {
        console.warn("⏳ Skipping CTM Submission: Form is incomplete.");
        return;
    }

    console.log("✅ Form is complete. Proceeding with CTM submission.");

    // ✅ Send Data to CTM
    setTimeout(async () => {
        try {
            const webhookPayload = req.body;
            const uniqueFormId = webhookPayload.userId || 'unknown_form_id';
            const callerName = webhookPayload.attributes?.Patient_Name || 'Unknown';
            const email = webhookPayload.userAttributes?.default_email || 'Unknown';
            const phoneNumber = webhookPayload.attributes?.Phone ? `1${webhookPayload.attributes.Phone}` : '';

            const comments = webhookPayload.attributes?.Comments;
            const formattedComments = (comments && comments.toLowerCase() === "skip") ? '' : comments || 'N/A';

            const customFields = {
                "date_of_birth": webhookPayload.attributes?.Patient_Birthday || 'N/A',
                "policy__id_number": webhookPayload.attributes?.Insurance_ID || 'N/A',
                "group_number": webhookPayload.attributes?.GroupNumber || 'N/A',
                "additional_information": formattedComments,
                "insurance_company": webhookPayload.attributes?.Insurance_Company || 'N/A',
            };

            const formData = new URLSearchParams();
            formData.append("phone_number", phoneNumber);
            formData.append("caller_name", callerName);
            formData.append("email", email);
            formData.append("unique_form_id", uniqueFormId);
            formData.append("visitor_sid", visitor_sid);

            Object.entries(customFields).forEach(([key, value]) => {
                formData.append(`custom_fields[${key}]`, value);
            });

            console.log('📡 Sending data to CTM:', Object.fromEntries(formData));

            const response = await axios.post(
                `https://api.calltrackingmetrics.com/api/v1/formreactor/FRT472ABB2C5B9B141A72DE8F1EAEC5B92869204BB360DAC3258581C359708A94E4`,
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
    }, 0);
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[ChatBot] Webhook is listening on port ${PORT}`));
