# maori-upload
This repository contains the source code for the Maori upload web app. It is in an early development stage.

It is licensed under the Apache 2.0 license.

## Instructions
- Clone
- Run `npm install && npm run build`
- Run `python app.py`
- Open browser at `localhost:9777`

## S3 Bucket CORS Configuration
The uploader directly uploads the datasets into a AWS S3 buckets. However, this requires changes on the CORS configuration of the bucket:
```
<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
<CORSRule>
	<AllowedOrigin>*</AllowedOrigin>
	<AllowedMethod>GET</AllowedMethod>
	<AllowedMethod>PUT</AllowedMethod>
	<AllowedMethod>POST</AllowedMethod>
	<ExposeHeader>ETag</ExposeHeader>
	<AllowedHeader>*</AllowedHeader>
</CORSRule>
</CORSConfiguration>
``` 
For more information please check: http://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html. 
