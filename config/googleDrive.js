// config/googleDrive.js
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const auth = new google.auth.GoogleAuth({
  keyFile: 'google-drive-key.json', // file credentials JSON từ Google Cloud
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

export const getDriveClient = async () => {
  const authClient = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: authClient });
  return drive;
};
