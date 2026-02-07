import { uploadTranscript, getTranscript } from './src/lib/aws/s3-pointers';
import { s3Client } from './src/lib/aws/s3';

// Mock s3Client.send
// @ts-ignore
s3Client.send = async (command: any) => {
    console.log("Mock S3 Send called with:", command.constructor.name);
    console.log("Params:", {
        Bucket: command.input.Bucket,
        Key: command.input.Key,
        ContentType: command.input.ContentType
    });
    
    if (command.constructor.name === 'PutObjectCommand') {
        return {};
    }
    if (command.constructor.name === 'GetObjectCommand') {
        return {
            Body: {
                transformToString: async () => "mocked transcript content"
            }
        };
    }
    return {};
};

async function verify() {
    process.env.AWS_S3_BUCKET_NAME = "test-bucket";
    
    console.log("Testing upload...");
    const key = await uploadTranscript("sess_123", "hello world");
    console.log("Uploaded key:", key);

    console.log("Testing download...");
    const content = await getTranscript(key);
    console.log("Downloaded content:", content);
    
    if (content === "mocked transcript content") {
        console.log("VERIFICATION SUCCESSFUL");
    } else {
        console.log("VERIFICATION FAILED");
        process.exit(1);
    }
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});