import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/modules/admin/utils/permission-utils';
import { SYSTEM_PERMISSIONS } from '@/modules/admin/types';
import minioClient from '@/lib/minio';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
  }

  const canCreateProducts = await hasPermission(session.user.id, SYSTEM_PERMISSIONS.PRODUCT_CREATE);
  const canUpdateProducts = await hasPermission(session.user.id, SYSTEM_PERMISSIONS.PRODUCT_UPDATE);

  if (!canCreateProducts && !canUpdateProducts) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Filename and contentType are required' }, { status: 400 });
    }

    const bucketName = 'products';
    const objectName = `${uuidv4()}-${filename}`;

    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      // Optional: Set a public policy if images should be directly accessible
      // await minioClient.setBucketPolicy(bucketName, JSON.stringify(publicPolicy(bucketName)));
    }

    const presignedUrl = await minioClient.presignedPutObject(bucketName, objectName, 60 * 5); // 5 minutes expiry

    const finalUrl = `/${bucketName}/${objectName}`;

    return NextResponse.json({ uploadUrl: presignedUrl, finalUrl });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Could not generate upload URL' }, { status: 500 });
  }
}
