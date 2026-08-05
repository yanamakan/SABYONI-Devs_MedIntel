export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { feeling } = req.query;

    if (!feeling || !feeling.trim()) {
      return res.status(400).json({ error: 'No feeling provided' });
    }

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) {
      return res.status(500).json({ error: 'YouTube API not configured' });
    }

    // Smart keyword mapping based on feeling
    const searchQuery = mapFeelingToQuery(feeling.toLowerCase().trim());
    console.log('YouTube key length:', YOUTUBE_API_KEY.length);
    console.log('Search query:', searchQuery);;

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=9&q=${encodeURIComponent(searchQuery)}&type=video&safeSearch=strict&relevanceLanguage=en&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
        const errText = await response.text();
        console.error('YouTube API error status:', response.status);
        console.error('YouTube API error body:', errText);
        return res.status(502).json({ 
            error: 'YouTube API error ' + response.status + ': ' + errText.substring(0, 300)
        });
    }

    const data = await response.json();

    // if (!YOUTUBE_API_KEY) {
    // return res.status(500).json({ error: 'YouTube API not configured' });
    // }
    // console.log('YouTube key present, length:', YOUTUBE_API_KEY.length);
    // console.log('Search query:', searchQuery);
    

    if (!data.items || data.items.length === 0) {
      return res.status(200).json({ videos: [], query: searchQuery });
    }

    const videos = data.items.map(item => ({
      id:          item.id.videoId,
      title:       item.snippet.title,
      channel:     item.snippet.channelTitle,
      thumbnail:   item.snippet.thumbnails.medium.url,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt
    }));

    return res.status(200).json({ videos, query: searchQuery });

  } catch (err) {
    console.error('YouTube handler error:', err.message);
    return res.status(500).json({ error: 'Internal server error' + err.message });
  }
}

function mapFeelingToQuery(feeling) {
  // Muscle/physical pain
  if (feeling.match(/muscle|strain|stiff|sore|tight|cramp|spasm/)) {
    return 'gentle stretching exercises for muscle strain relief';
  }
  if (feeling.match(/back pain|backache|spine|lumbar/)) {
    return 'back pain relief stretching exercises';
  }
  if (feeling.match(/neck|shoulder pain|shoulder tension/)) {
    return 'neck and shoulder pain relief exercises';
  }
  if (feeling.match(/joint|knee|hip|arthritis/)) {
    return 'gentle joint pain relief exercises';
  }

  // Breathing/respiratory
  if (feeling.match(/breath|breathing|chest tight|asthma|shortness/)) {
    return 'breathing exercises for respiratory health';
  }

  // Mental/emotional
  if (feeling.match(/anxious|anxiety|panic|worry|nervous|stress/)) {
    return 'anxiety relief breathing exercises calm';
  }
  if (feeling.match(/stress|overwhelm|tension|pressure/)) {
    return 'stress relief relaxation techniques meditation';
  }
  if (feeling.match(/sad|depress|low|down|unhappy|hopeless/)) {
    return 'mood lifting gentle yoga meditation wellness';
  }
  if (feeling.match(/angry|frustrat|irritat|upset/)) {
    return 'anger management calm breathing meditation';
  }
  if (feeling.match(/lonely|isolat|alone/)) {
    return 'mindfulness meditation for wellbeing connection';
  }

  // Sleep
  if (feeling.match(/sleep|insomnia|tired|fatigue|exhaust|restless/)) {
    return 'sleep meditation relaxation for better sleep';
  }
  if (feeling.match(/can.t sleep|cant sleep|awake|lying awake/)) {
    return 'guided sleep meditation insomnia relief';
  }

  // Headache/migraine
  if (feeling.match(/headache|migraine|head pain|head throb/)) {
    return 'headache relief relaxation pressure points';
  }

  // Nausea/stomach
  if (feeling.match(/nausea|nauseous|dizzy|stomach|digest|bloat/)) {
    return 'nausea relief gentle movement breathing';
  }

  // Energy
  if (feeling.match(/tired|low energy|sluggish|lethargic|weak/)) {
    return 'gentle energising morning exercises wellness';
  }
  if (feeling.match(/energetic|active|workout|exercise|fit/)) {
    return 'full body workout exercise routine health';
  }

  // Heart/blood pressure
  if (feeling.match(/heart|blood pressure|hypertension|palpitat/)) {
    return 'heart health gentle exercise breathing techniques';
  }

  // Meditation/mindfulness general
  if (feeling.match(/meditat|mindful|calm|peace|relax|zen/)) {
    return 'guided meditation mindfulness relaxation';
  }

  // Yoga
  if (feeling.match(/yoga|stretch|flex|balance/)) {
    return 'gentle yoga stretching for health and wellness';
  }

  // Default — general health wellness
  return 'health and wellness ' + feeling + ' exercises relaxation';
}