import fs from "fs";
import path from "path";

const writableDirectory = (directory) => {
  try {
    if (!fs.statSync(directory).isDirectory()) return false;
    fs.accessSync(directory, fs.constants.W_OK | fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

export function selectDatabasePath(configuredPath, localPath) {
  if (!configuredPath) return localPath;

  const requestedPath = path.resolve(configuredPath);
  const parent = path.dirname(requestedPath);
  try {
    if (!writableDirectory(parent)) throw new Error("Database directory is unavailable or not writable");
    if (fs.existsSync(requestedPath)) {
      if (!fs.statSync(requestedPath).isFile()) throw new Error("Database path is not a file");
      fs.accessSync(requestedPath, fs.constants.R_OK | fs.constants.W_OK);
    }
    return requestedPath;
  } catch (error) {
    console.warn(`DATABASE_PATH cannot be used (${error.message}); using the local database path.`);
    return localPath;
  }
}

export function selectDocumentsDirectory(configuredPath, localPath) {
  if (!configuredPath) return localPath;

  const requestedPath = path.resolve(configuredPath);
  const parent = path.dirname(requestedPath);
  try {
    if (!writableDirectory(parent)) throw new Error("Document directory parent is unavailable or not writable");
    if (!fs.existsSync(requestedPath)) fs.mkdirSync(requestedPath);
    if (!writableDirectory(requestedPath)) throw new Error("Document directory is not writable");
    return requestedPath;
  } catch (error) {
    console.warn(`DOCUMENTS_DIR cannot be used (${error.message}); using the local uploads directory.`);
    return localPath;
  }
}
