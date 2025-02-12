const express = require('express');
const app = express();

console.log('the site is up")

app.use(express.json());

// Handle GET requests for webhook validation
app.get('/havenhealthchatbot', (req, res) => {
  const challenge = req.query.challenge;
  if (challenge) {
    console.log(`Responding with challenge: ${challenge}`);
    res.status(200).send(challenge);  // Respond with the challenge value
  } else {
    res.status(400).send('Missing challenge parameter');
  }
});

// Handle POST requests for incoming webhook data
app.post('/webhook', (req, res) => {
  console.log('--- Incoming Webhook from Chatbot.com ---');
  console.log(JSON.stringify(req.body, null, 2));
  res.status(200).send({ message: 'Webhook received successfully', receivedData: req.body });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
