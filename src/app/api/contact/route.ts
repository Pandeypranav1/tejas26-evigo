import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

function validatePayload(payload: any): string | null {
  if (!payload) return 'Invalid request body';
  const { name, email, message } = payload as ContactMessage;
  if (!name?.trim()) return 'Name is required';
  if (!email?.trim()) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Invalid email address';
  if (!message?.trim()) return 'Message is required';
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

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('contact_messages')
      .insert({ name, email, message })
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      // Return detailed error for debugging
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ message: 'Message sent successfully.' }, { status: 200 });
  } catch (err: any) {
    console.error('Unexpected error in /api/contact:', err);
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}
