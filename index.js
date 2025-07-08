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
    origin: "https://neveralonerehab.com", // ✅ Only allow this origin
    methods: "POST,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
}));

app.use(bodyParser.json());

// ✅ Rate Limiting: Prevent API Abuse (100 requests per 10 min per IP)
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100,
    message: "⚠️ Too many requests. Please try again later.",
});
app.use(limiter);

// ✅ Traffic Logging (Logs all API calls for monitoring)
app.use(morgan('combined'));

// ✅ Temporary storage for visitor SIDs (linked by CTM_Session_ID)
const visitorSessions = new Map();

const token = 'VERIFICATION_TOKEN';
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

// ✅ Phone normalization helper
function toE164(number) {
    const digits = number.trim().replace(/\D/g, '');
    if (!digits || digits.length < 10 || digits.length > 11) return null;
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return null;
}

// ✅ Webhook verification (GET request)
app.get('/', (req, res) => {
    if (req.query.token !== token) {
        return res.sendStatus(401);
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

    visitorSessions.set("CTM_Session_ID", visitor_sid);
    console.log(`✅ Stored Visitor SID: ${visitor_sid} as CTM_Session_ID`);

    res.status(200).json({ message: "Visitor SID stored successfully." });
});

// ✅ Combined Webhook Handler - Accepts Data & Sends to CTM
app.post('/', async (req, res) => {
    console.log('--- Incoming Webhook from Chatbot.com ---');
    console.log(JSON.stringify(req.body, null, 2));

    const webhookPayload = req.body;
    const visitor_sid = visitorSessions.get("CTM_Session_ID") || "unknown_sid";

    console.log(`📌 Processing Chatbot Data:`);
    console.log(`   - Retrieved Visitor SID (CTM_Session_ID): ${visitor_sid}`);

    const rawPhone = webhookPayload.attributes?.Phone || '';
    const phoneNumber = toE164(rawPhone);

    // ✅ Reject invalid phone number with Chatbot re-prompt
    if (!phoneNumber) {
        console.warn(`🚫 Invalid phone format: Raw = '${rawPhone}', Digits = '${rawPhone.replace(/\D/g, '')}'`);
        return res.status(200).json({
            attributes: {
                is_phone_valid: "no"
            },
            messages: [
                {
                    text: "❗ The phone number you entered appears to be invalid. Please enter a valid 10-digit US number like 555-555-5555."
                }
            ]
        });
    }

    // ✅ Respond early if this is only a phone validation webhook
    if (!webhookPayload.attributes?.isComplete) {
        console.log("🔁 Early phone validation webhook. Skipping CTM/DB logic.");
        return res.status(200).json({
            attributes: {
                visitor_sid: visitor_sid,
                CTM_Session_ID: visitor_sid,
                is_phone_valid: "yes"
            }
        });
    }

    let isComplete = webhookPayload.attributes?.isComplete;

    if (typeof isComplete === 'undefined' || isComplete === null) {
        console.warn("⚠️ 'isComplete' field is missing or undefined.");
        isComplete = "no";
    }

    console.log(`📋 Form Completion Status (isComplete): ${isComplete}`);

    res.status(200).json({
        attributes: {
            visitor_sid: visitor_sid,
            CTM_Session_ID: visitor_sid,
            is_phone_valid: "yes"
        }
    });

    if (isComplete.toLowerCase().trim() !== "yes") {
        console.warn("⏳ Skipping CTM Submission: Form is incomplete.");
        return;
    }

    console.log("✅ Form is complete. Proceeding with CTM submission.");

    setTimeout(async () => {
        try {
            const uniqueFormId = webhookPayload.userId || 'unknown_form_id';
            const callerName = webhookPayload.attributes?.Patient_Name || 'Unknown';
            const email = webhookPayload.userAttributes?.default_email || 'Unknown';

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
