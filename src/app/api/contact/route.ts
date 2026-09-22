import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

// Define the shape of the expected request body
interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

// Simple server‑side validation helper
function validatePayload(payload: any): string | null {
  if (!payload) return 'Invalid request body';
  const { name, email, message } = payload as ContactMessage;
  if (!name || typeof name !== 'string' || !name.trim()) return 'Name is required';
  if (!email || typeof email !== 'string' || !email.trim()) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Invalid email address';
  if (!message || typeof message !== 'string' || !message.trim()) return 'Message is required';
  return null;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const validationError = validatePayload(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { name, email, message } = payload as ContactMessage;

    // Use the admin client – this runs only on the server, so the service role key stays secret
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('contact_messages')
      .insert({ name, email, message })
      .select(); // return the inserted row for confirmation (optional)

    if (error) {
      console.error('Supabase insert error:', error);
      // Do not expose internal details to the client
      return NextResponse.json({ error: 'Failed to save your message. Please try again later.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Message sent successfully.' }, { status: 200 });
  } catch (err: any) {
    console.error('Unexpected error in /api/contact:', err);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
