import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    const fileSizeBytes = file.size;
    const fileSizeMB = (fileSizeBytes / 1024 / 1024).toFixed(2);
    const mimeType = file.type;

    console.log(`[upload] Starting upload — size: ${fileSizeMB}MB, type: ${mimeType}`);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueId = `reel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'gpt-unfiltered-reels',
          public_id: uniqueId,
          format: 'mp4',
          unique_filename: true,
          overwrite: false,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    const durationMs = Date.now() - startTime;
    console.log(`[upload] Success — url: ${result.secure_url}, duration: ${durationMs}ms`);

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      fileSizeMB,
      mimeType,
      durationMs,
      cloudinaryBytes: result.bytes,
    });
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error('[upload] Error:', error);
    const message = error?.message || error?.error?.message || JSON.stringify(error);
    return NextResponse.json({ error: message, durationMs }, { status: 500 });
  }
}
