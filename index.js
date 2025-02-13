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

  // Check for 'challenge' parameter in the request body
  if (!req.body.challenge) {
    console.error('Missing challenge parameter');
    return res.status(400).send('Missing challenge parameter');
  }

  // Respond with the challenge value
  res.status(200).json({ challenge: req.body.challenge });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
