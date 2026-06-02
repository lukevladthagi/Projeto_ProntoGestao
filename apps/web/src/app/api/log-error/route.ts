import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level, message, stack, url, userAgent, context } = body;

    // Log to console with timestamp
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${context || ''} - ${message}`;

    console.log('='.repeat(80));
    console.log(logMessage);
    if (stack) {
      console.log('Stack:', stack);
    }
    if (url) {
      console.log('URL:', url);
    }
    if (userAgent) {
      console.log('User Agent:', userAgent);
    }
    console.log('='.repeat(80));

    // In production, you could send this to a logging service like Sentry, LogRocket, etc.
    // await sendToLoggingService({ level, message, stack, url, userAgent, context });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error logging error:', error);
    return Response.json({ success: false, error: 'Failed to log' }, { status: 500 });
  }
}
