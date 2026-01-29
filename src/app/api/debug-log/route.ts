import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const LOG_PATH = join(process.cwd(), '..', '.cursor', 'debug.log');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const line = JSON.stringify(body) + '\n';
    const dir = join(process.cwd(), '..', '.cursor');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(LOG_PATH, line, { flag: 'a' });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
