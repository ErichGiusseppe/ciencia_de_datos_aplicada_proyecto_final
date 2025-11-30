import { NextRequest, NextResponse } from 'next/server';
import { checkIdExists } from '@/lib/data-store';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const type = searchParams.get('type') as 'student' | 'course';

  if (!id || !type) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const exists = checkIdExists(type, id);

  return NextResponse.json({ exists });
}