import type { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';

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
    
    // ✅ FIX: Stream the response instead of buffering it
    if (response.body) {
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      const readableStream = Readable.fromWeb(response.body as any);
      readableStream.pipe(res);
    } else {
      return res.status(500).json({ message: 'Image response has no body' });
    }
  } catch (error) {
    console.error('Error fetching image:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}