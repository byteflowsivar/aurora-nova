import * as Minio from 'minio';

const globalForMinio = globalThis as unknown as {
  minio: Minio.Client | undefined;
};

const minioPort = process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : 9000;
const useSSL = process.env.MINIO_USE_SSL === 'true';

export const minioClient =
  globalForMinio.minio ??
  new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || '127.0.0.1',
    port: minioPort,
    useSSL: useSSL,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minio_admin',
    secretKey: process.env.MINIO_SECRET_KEY || 'changeme_in_production',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForMinio.minio = minioClient;
}

export default minioClient;
