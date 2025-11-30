import { NextRequest, NextResponse } from 'next/server';
import { checkIdExists, getCourseCredits } from '@/lib/data-store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') as 'student' | 'course';
  const id = searchParams.get('id');

  if (!type || !id) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const exists = checkIdExists(type, id);
  
  if (type === 'course' && exists) {
    const credits = getCourseCredits(id);
    return NextResponse.json({ exists, credits });
  }

  return NextResponse.json({ exists });
}