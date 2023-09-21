// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

// THIS SCRIPT IS GENERATED BY THE "rush deploy" COMMAND.

import * as fs from 'fs';
import * as path from 'path';
import type { IExtractorMetadataJson } from '../PackageExtractor';
import type { IFileSystemCreateLinkOptions } from '@rushstack/node-core-library';

// API borrowed from @rushstack/node-core-library, since this script avoids using any
// NPM dependencies.
class FileSystem {
  public static createSymbolicLinkJunction(options: IFileSystemCreateLinkOptions): void {
    fs.symlinkSync(options.linkTargetPath, options.newLinkPath, 'junction');
  }

  public static createSymbolicLinkFile(options: IFileSystemCreateLinkOptions): void {
    fs.symlinkSync(options.linkTargetPath, options.newLinkPath, 'file');
  }

  public static createSymbolicLinkFolder(options: IFileSystemCreateLinkOptions): void {
    fs.symlinkSync(options.linkTargetPath, options.newLinkPath, 'dir');
  }

  public static createHardLink(options: IFileSystemCreateLinkOptions): void {
    fs.linkSync(options.linkTargetPath, options.newLinkPath);
  }
}

function ensureFolder(folderPath: string): void {
  if (!folderPath) {
    return;
  }
  if (fs.existsSync(folderPath)) {
    return;
  }
  const parentPath: string = path.dirname(folderPath);
  if (parentPath && parentPath !== folderPath) {
    ensureFolder(parentPath);
  }
  fs.mkdirSync(folderPath);
}

function removeLinks(targetRootFolder: string, extractorMetadataObject: IExtractorMetadataJson): void {
  for (const linkInfo of extractorMetadataObject.links) {
    // Link to the relative path for symlinks
    const newLinkPath: string = path.join(targetRootFolder, linkInfo.linkPath);
    if (fs.existsSync(newLinkPath)) {
      fs.unlinkSync(newLinkPath);
    }
  }
}

function createLinks(targetRootFolder: string, extractorMetadataObject: IExtractorMetadataJson): void {
  for (const linkInfo of extractorMetadataObject.links) {
    // Link to the relative path for symlinks
    const newLinkPath: string = path.join(targetRootFolder, linkInfo.linkPath);
    const linkTargetPath: string = path.join(targetRootFolder, linkInfo.targetPath);

    // Make sure the containing folder exists
    ensureFolder(path.dirname(newLinkPath));

    // NOTE: This logic is based on NpmLinkManager._createSymlink()
    if (process.platform === 'win32') {
      if (linkInfo.kind === 'folderLink') {
        // For directories, we use a Windows "junction".  On Unix, this produces a regular symlink.
        FileSystem.createSymbolicLinkJunction({ newLinkPath, linkTargetPath });
      } else {
        // For files, we use a Windows "hard link", because creating a symbolic link requires
        // administrator permission.

        // NOTE: We cannot use the relative path for hard links
        FileSystem.createHardLink({ newLinkPath, linkTargetPath });
      }
    } else {
      // However hard links seem to cause build failures on Mac, so for all other operating systems
      // we use symbolic links for this case.
      if (linkInfo.kind === 'folderLink') {
        FileSystem.createSymbolicLinkFolder({ newLinkPath, linkTargetPath });
      } else {
        FileSystem.createSymbolicLinkFile({ newLinkPath, linkTargetPath });
      }
    }
  }
}

function showUsage(): void {
  console.log('Usage:');
  console.log('  node create-links.js create');
  console.log('  node create-links.js remove');

  console.log('\nCreates or removes the symlinks for the output folder created by "rush deploy".');
  console.log('The link information is read from "extractor-metadata.json" in the same folder.');
}

function main(): boolean {
  // Example: [ "node.exe", "create-links.js", ""create" ]
  const args: string[] = process.argv.slice(2);

  if (args.length !== 1 || (args[0] !== 'create' && args[0] !== 'remove')) {
    showUsage();
    return false;
  }

  const targetRootFolder: string = __dirname;
  const extractorMetadataPath: string = path.join(targetRootFolder, 'extractor-metadata.json');

  if (!fs.existsSync(extractorMetadataPath)) {
    throw new Error('Input file not found: ' + extractorMetadataPath);
  }

  const extractorMetadataJson: string = fs.readFileSync(extractorMetadataPath).toString();
  const extractorMetadataObject: IExtractorMetadataJson = JSON.parse(extractorMetadataJson);

  if (args[0] === 'create') {
    console.log(`\nCreating links for extraction at path "${targetRootFolder}"`);
    removeLinks(targetRootFolder, extractorMetadataObject);
    createLinks(targetRootFolder, extractorMetadataObject);
  } else {
    console.log(`\nRemoving links for extraction at path "${targetRootFolder}"`);
    removeLinks(targetRootFolder, extractorMetadataObject);
  }

  console.log('The operation completed successfully.');
  return true;
}

try {
  process.exitCode = 1;
  if (main()) {
    process.exitCode = 0;
  }
} catch (error) {
  console.log('ERROR: ' + error);
}
