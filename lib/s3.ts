import * as Minio from 'minio'

export const s3Client = new Minio.Client({
  endPoint: process.env["S3_ENDPOINT"] as string,
  port: parseInt( process.env["S3_PORT"] ?? ""),
  useSSL: process.env["S3_ENDPOINT"] !== "localhost",
  accessKey: process.env["S3_ACCESS"] as string,
  secretKey: process.env["S3_SECRET"] as string,
})
