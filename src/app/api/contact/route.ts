import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Create a Supabase client with the anon key on the server side.
    // The service role key in .env.local is not a standard JWT, so it does
    // not bypass RLS. Instead we use the anon key and rely on the existing
    // RLS INSERT policy that was configured for the contact_messages table.
    // The anon key is safe here because this code runs only on the server.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Do not chain .select() — the RLS policy may only allow INSERT, not SELECT.
    const { error } = await supabase
      .from('contact_messages')
      .insert({ name: name.trim(), email: email.trim(), message: message.trim() });

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to save your message. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Message sent successfully!' }, { status: 200 });
  } catch (err: any) {
    console.error('Unexpected error in /api/contact:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
