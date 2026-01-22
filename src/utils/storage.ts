import { mkdir } from "fs/promises";
import { join } from "path";

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}_${hour}${minute}${second}`;
}

export async function saveScreenshot(
  buffer: Buffer,
  saveDir: string
): Promise<string> {
  const now = new Date();
  const dateFolder = formatDate(now);
  const fileName = `${formatDateTime(now)}.png`;

  const folderPath = join(saveDir, dateFolder);
  await mkdir(folderPath, { recursive: true });

  const filePath = join(folderPath, fileName);
  await Bun.write(filePath, buffer);

  return filePath;
}

export function bufferToBase64DataUrl(buffer: Buffer): string {
  const base64 = buffer.toString("base64");
  return `data:image/png;base64,${base64}`;
}
