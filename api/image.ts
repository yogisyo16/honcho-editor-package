import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { imageUrl } = req.query;

  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ message: 'imageUrl parameter is required' });
  }

  try {
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({ message: 'Failed to fetch image' });
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    // Set appropriate headers
    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS
    
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Error fetching image:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}