import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export const runtime = 'edge'; // 🔥 IMPORTANT

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
        addRandomSuffix: true,
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('Uploaded:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}