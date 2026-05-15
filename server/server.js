import 'dotenv/config';
import express from 'express';
import { searchSpots } from './gemini.js';

const app = express();
app.use(express.json());
app.use(express.static('src'));

app.post('/api/search', async (req, res) => {
  const { query, spots } = req.body;
  const response = await searchSpots(query, spots);
  res.json({ response });
});

app.listen(3000, () => console.log('Server running on port 3000'));