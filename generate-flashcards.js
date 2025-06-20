export default async function handler(req, res) {
    // Enable CORS for your Chrome extension
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      const { content, cardCount = 25 } = req.body;
  
      if (!content || content.length < 20) {
        return res.status(400).json({ 
          error: 'Content too short. Minimum 20 characters required.' 
        });
      }
  
      const prompt = `Create exactly ${cardCount} flashcards from this content. Return only valid JSON:
  
  {
    "flashcards": [
      {"front": "Question", "back": "Answer"}
    ]
  }
  
  Content: ${content}`;
  
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini", // Using the actual model name
          messages: [
            { role: "system", content: "Return only valid JSON flashcards." },
            { role: "user", content: prompt }
          ],
          max_tokens: cardCount * 40,
          temperature: 0.3
        })
      });
  
      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
  
      // Clean and parse response
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/\n?```$/, '');
      }
  
      const parsed = JSON.parse(cleanResponse);
      
      if (!parsed.flashcards) {
        throw new Error('Invalid format');
      }
  
      const cards = parsed.flashcards.map((card, index) => ({
        id: Date.now() + index,
        front: card.front,
        back: card.back
      }));
  
      res.status(200).json({
        success: true,
        cards: cards,
        count: cards.length
      });
  
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate flashcards'
      });
    }
  }