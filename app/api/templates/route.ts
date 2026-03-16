import { google } from "googleapis";
import { NextResponse } from "next/server";

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

function getServiceAccountCredentials(): GoogleServiceAccount {
  const credentialsJson =
    process.env.GOOGLE_CREDENTIALS_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (credentialsJson) {
    const parsed = JSON.parse(credentialsJson) as GoogleServiceAccount;

    if (!parsed.client_email || !parsed.private_key) {
      throw new Error(
        "Google service account JSON is missing client_email or private_key."
      );
    }

    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key.replace(/\\n/g, "\n"),
      project_id: parsed.project_id,
    };
  }

  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const projectId = process.env.GOOGLE_PROJECT_ID;

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Google credentials. Set GOOGLE_CREDENTIALS_JSON or GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY."
    );
  }

  return {
    client_email: clientEmail,
    private_key: privateKey.replace(/\\n/g, "\n"),
    project_id: projectId,
  };
}

function getTemplateFolderId(): string {
  const folderId =
    process.env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID ||
    process.env.GOOGLE_DRIVE_TEMPLATES_FOLDER_ID ||
    process.env.TEMPLATE_FOLDER_ID ||
    process.env.PDF_TEMPLATE_FOLDER_ID ||
    process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error(
      "Missing template folder ID. Set GOOGLE_DRIVE_TEMPLATE_FOLDER_ID or GOOGLE_DRIVE_TEMPLATES_FOLDER_ID or TEMPLATE_FOLDER_ID or PDF_TEMPLATE_FOLDER_ID or GOOGLE_DRIVE_FOLDER_ID."
    );
  }

  return folderId;
}

function getDriveClient() {
  const creds = getServiceAccountCredentials();

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
      project_id: creds.project_id,
    },
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}

export async function GET() {
  try {
    const folderId = getTemplateFolderId();
    const drive = getDriveClient();

    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and mimeType = 'application/pdf'`,
      fields:
        "files(id,name,mimeType,webViewLink,thumbnailLink,createdTime,modifiedTime,size)",
      orderBy: "modifiedTime desc",
      pageSize: 100,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    const templates =
      response.data.files?.map((file) => ({
        id: file.id ?? "",
        name: file.name ?? "Untitled PDF",
        mimeType: file.mimeType ?? "application/pdf",
        webViewLink: file.webViewLink ?? null,
        thumbnailLink: file.thumbnailLink ?? null,
        createdTime: file.createdTime ?? null,
        modifiedTime: file.modifiedTime ?? null,
        size: file.size ?? null,
      })) ?? [];

    return NextResponse.json(templates, { status: 200 });
  } catch (error) {
    console.error("Failed to list templates:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";

    return NextResponse.json(
      {
        error: "Failed to list templates.",
        details: message,
      },
      { status: 500 }
    );
  }
}
