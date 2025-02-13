const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request body
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.send('Hello from the root route!');
});

// Webhook route
app.post('/webhook', (req, res) => {
  console.log('Webhook received:', req.body);

  if (!req.body.challenge) {
    return res.status(400).send('Missing challenge parameter');
  }

  // Respond with the challenge value as plain text
  res.status(200).send(req.body.challenge);
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
