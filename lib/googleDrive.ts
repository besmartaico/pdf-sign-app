import fs from "fs"
import path from "path"
import { Readable } from "stream"
import { google } from "googleapis"

function getServiceAccountAuth() {
  const envJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

  if (envJson) {
    const credentials = JSON.parse(envJson)

    return new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive"]
    })
  }

  const configuredPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

  let keyFilePath

  if (configuredPath) {
    keyFilePath = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath)
  } else {
    keyFilePath = path.join(
      process.cwd(),
      "credentials",
      "formsigner-service-account.json"
    )
  }

  if (!fs.existsSync(keyFilePath)) {
    throw new Error(`Service account key file not found at: ${keyFilePath}`)
  }

  return new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ["https://www.googleapis.com/auth/drive"]
  })
}

export function getServiceAccountDriveClient() {
  const auth = getServiceAccountAuth()

  return google.drive({
    version: "v3",
    auth
  })
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
    fields: "id,name,mimeType,parents",
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
    orderBy: "modifiedTime desc",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  })

  return response.data.files || []
}

export async function deleteFileWithServiceAccount({ fileId }: { fileId: string }) {
  const auth = getServiceAccountAuth()
  const drive = google.drive({ version: "v3", auth })
  await drive.files.delete({ fileId })
}

export async function updateFileMetadataWithServiceAccount({
  fileId,
  appProperties,
}: {
  fileId: string
  appProperties: Record<string, string>
}) {
  const drive = getServiceAccountDriveClient()
  await drive.files.update({
    fileId,
    requestBody: { appProperties },
  })
}

export async function getFileAppPropertiesWithServiceAccount(fileId: string): Promise<Record<string, string>> {
  const drive = getServiceAccountDriveClient()
  const res = await drive.files.get({
    fileId,
    fields: "appProperties",
  })
  return (res.data.appProperties as Record<string, string>) || {}
}
