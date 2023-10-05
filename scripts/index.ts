import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
console.log("Hello via Bun!")

// Generate new model

// TODO: run jupyter notebook from CLI

const client = new S3Client({ region: "us-east-1" })
const file = Bun.file("../model/output_json.json")
const text = await file.text()

// Use client to upload files to S3
try {
  const data = await client.send(
    new PutObjectCommand({
      Bucket: "wastewater-2023",
      Key: "output2.json",
      Body: text,
    })
  )
  console.log(data)
} catch (err) {
  console.log(err)
}
