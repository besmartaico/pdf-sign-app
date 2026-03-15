import fs from "fs"
import path from "path"
import { Readable } from "stream"
import { google } from "googleapis"

function getServiceAccountKeyFilePath() {
  const configuredPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath)
  }

  return path.join(process.cwd(), "credentials", "formsigner-service-account.json")
}

export function getDriveClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2()

  oauth2Client.setCredentials({
    access_token: accessToken
  })

  return google.drive({
    version: "v3",
    auth: oauth2Client
  })
}

export function getServiceAccountDriveClient() {
  const keyFilePath = getServiceAccountKeyFilePath()

  if (!fs.existsSync(keyFilePath)) {
    throw new Error(`Service account key file not found at: ${keyFilePath}`)
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ["https://www.googleapis.com/auth/drive"]
  })

  return google.drive({
    version: "v3",
    auth
  })
}

export async function uploadBufferToDrive(params: {
  accessToken: string
  buffer: Buffer
  fileName: string
  folderId: string
  mimeType?: string
}) {
  const drive = getDriveClient(params.accessToken)

  const response = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.folderId]
    },
    media: {
      mimeType: params.mimeType || "application/pdf",
      body: Readable.from(params.buffer)
    },
    fields: "id,name,webViewLink",
    supportsAllDrives: true
  })

  return response.data
}

export async function uploadBufferToDriveWithServiceAccount(params: {
  buffer: Buffer
  fileName: string
  folderId: string
  mimeType?: string
}) {
  const drive = getServiceAccountDriveClient()

  const response = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.folderId]
    },
    media: {
      mimeType: params.mimeType || "application/pdf",
      body: Readable.from(params.buffer)
    },
    fields: "id,name,webViewLink",
    supportsAllDrives: true
  })

  return response.data
}

export async function downloadFileFromGoogleDrive(params: {
  accessToken: string
  fileId: string
}) {
  const drive = getDriveClient(params.accessToken)

  const response = await drive.files.get(
    {
      fileId: params.fileId,
      alt: "media",
      supportsAllDrives: true
    },
    {
      responseType: "arraybuffer"
    }
  )

  return Buffer.from(response.data as ArrayBuffer)
}

export async function downloadFileFromGoogleDriveWithServiceAccount(params: {
  fileId: string
}) {
  const drive = getServiceAccountDriveClient()

  const response = await drive.files.get(
    {
      fileId: params.fileId,
      alt: "media",
      supportsAllDrives: true
    },
    {
      responseType: "arraybuffer"
    }
  )

  return Buffer.from(response.data as ArrayBuffer)
}

export async function getGoogleDriveFileMetadata(params: {
  accessToken: string
  fileId: string
}) {
  const drive = getDriveClient(params.accessToken)

  const response = await drive.files.get({
    fileId: params.fileId,
    fields: "id,name,mimeType,webViewLink,parents",
    supportsAllDrives: true
  })

  return response.data
}

export async function getGoogleDriveFileMetadataWithServiceAccount(params: {
  fileId: string
}) {
  const drive = getServiceAccountDriveClient()

  const response = await drive.files.get({
    fileId: params.fileId,
    fields: "id,name,mimeType,webViewLink,parents",
    supportsAllDrives: true
  })

  return response.data
}

export async function getGoogleDriveFolderMetadataWithServiceAccount(params: {
  folderId: string
}) {
  const drive = getServiceAccountDriveClient()

  const response = await drive.files.get({
    fileId: params.folderId,
    fields: "id,name,mimeType,driveId,parents",
    supportsAllDrives: true
  })

  return response.data
}

export async function listFilesInFolderWithServiceAccount(params: {
  folderId: string
}) {
  const drive = getServiceAccountDriveClient()

  const response = await drive.files.list({
    q: `'${params.folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,webViewLink,modifiedTime)",
    orderBy: "modifiedTime desc, name",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  })

  return response.data.files || []
}