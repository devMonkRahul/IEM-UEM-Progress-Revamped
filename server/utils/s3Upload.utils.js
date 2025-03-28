import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs/promises';
import { config } from "../constants.js";

const s3Client = new S3Client({ 
    region: config.awsRegion,
    credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey
    } 
});

export const uploadFile = async (file) => {
    try {
        const fileContent = await fs.readFile(file.path);

        const command = new PutObjectCommand({
            Bucket: config.s3BucketName,
            Key: file.filename,
            Body: fileContent,
            ContentType: file.mimetype,
        });

        await s3Client.send(command);

        // Remove file from temp folder
        await fs.unlink(file.path);
        
        return file.filename;
    } catch (err) {
        throw new Error(`Failed to upload to S3: ${err.message}`);
    }
};

export const generateSignedUrl = async (key) => {
    try {
        const command = new GetObjectCommand({
            Bucket: config.s3BucketName,
            Key: key,
            Expires: 2 * 60 * 60, // 2 hour expiration
        });

        return await getSignedUrl(s3Client, command, { expiresIn: 60 * 60 });
    } catch (err) {
        throw new Error(`Failed to generate signed URL: ${err.message}`);
    }
};
