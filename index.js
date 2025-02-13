const express = require('express');
const app = express();

app.use(express.json()); // Middleware to parse JSON requests

// Handle GET requests for webhook validation
app.get('/', (req, res) => {
  const challenge = req.query.challenge;
  if (challenge) {
    console.log(`Responding with challenge: ${challenge}`);
    res.status(200).send(challenge);  // Respond with the challenge value as plain text
  } else {
    res.status(400).send('Missing challenge parameter');
  }
});

// Handle POST requests for incoming webhook data
app.post('/', (req, res) => {
  console.log('--- Incoming Webhook from Chatbot.com ---');
  console.log(JSON.stringify(req.body, null, 2));

  // Prepare a response that includes the original data
  const data = {
    receivedData: req.body,  // Include the full original data
    responses: [
      {
        type: 'randomText',
        messages: ['Hi', 'Hello']  // Chatbot's expected response format
      }
    ]
  };

  // Return the modified response with the original data
  res.status(200).json(data);
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
