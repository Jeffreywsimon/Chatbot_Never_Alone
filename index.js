const express = require('express');
const app = express();

// Middleware to parse incoming JSON payloads
app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('--- Incoming Webhook from Chatbot.com ---');
  console.log(JSON.stringify(req.body, null, 2)); // Log the full JSON payload in a readable format

  // Send a response back to acknowledge the webhook
  res.status(200).send({
    message: 'Webhook received successfully',
    receivedData: req.body
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
