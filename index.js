const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());  // Parse incoming JSON payloads

app.post('/webhook', async (req, res) => {
  try {
    console.log('Received webhook:', req.body);

    // Transform Chatbot.com data into the format expected by CTM
    const transformedData = {
      type: "chat",
      customer_name: req.body.name,
      custom_fields: {
        birthdate: req.body.birthdate,
        insurance_id: req.body.insurance_id
      },
      message: req.body.message
    };

    // Send the transformed data to CTM's API
    const response = await axios.post(
      'https://api.calltrackingmetrics.com/api/v1/accounts/YOUR_ACCOUNT_ID/activity',
      transformedData,
      {
        headers: {
          Authorization: `Bearer YOUR_CTM_API_KEY`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Data forwarded to CTM:', response.data);
    res.status(200).send('Data successfully forwarded to CTM');
  } catch (error) {
    console.error('Error forwarding to CTM:', error.response ? error.response.data : error.message);
    res.status(500).send('Error forwarding to CTM');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
