// scripts/install.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import * as tar from 'tar';
import unzipper from 'unzipper';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, '..');
const binPath = path.join(rootPath, 'bin');


async function getLatestReleaseVersion() {
    console.log('Fetching latest release version from GitHub...');
    const response = await fetch('https://api.github.com/repos/bootandy/dust/releases/latest');
    if (!response.ok) {
        throw new Error(`Failed to fetch releases: ${response.statusText}`);
    }
    const release = await response.json();
    console.log(`Latest version is ${release.tag_name}`);
    return release.tag_name;
}

function getAssetName(version, platform, identifier) {
    const extension = platform === 'win32' ? 'zip' : 'tar.gz';
    return `dust-${version}-${identifier}.${extension}`;
}

async function downloadAndExtract(url, platform, arch) {
    console.log(`Downloading for ${platform}-${arch} from ${url}...`);
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`Error downloading ${url}: ${response.statusText}`);
        return false;
    }

    const binaryName = `dust${platform === 'win32' ? '.exe' : ''}`;
    const finalBinaryPath = path.join(binPath, binaryName);

    if (url.endsWith('.zip')) {
        // Handle .zip for Windows
        response.body.pipe(unzipper.Parse())
            .on('entry', (entry) => {
                const fileName = path.basename(entry.path);
                if (fileName === binaryName) {
                    entry.pipe(fs.createWriteStream(finalBinaryPath))
                        .on('finish', () => fs.chmodSync(finalBinaryPath, 0o755));
                } else {
                    entry.autodrain();
                }
            });
    } else {
        // Handle .tar.gz
        response.body.pipe(tar.x({
            strip: 1,
            cwd: binPath,
            filter: (filePath) => path.basename(filePath) === binaryName
        }))
            .on('finish', () => {
                if (fs.existsSync(finalBinaryPath)) {
                    fs.chmodSync(finalBinaryPath, 0o755);
                }
            });
    }
    console.log(`Downloaded and extracted to ${finalBinaryPath}`);
    return true;
}

async function main() {
    try {
        const requestedVersion = process.env.npm_config_dust_ver;
        const latestVersion = await getLatestReleaseVersion();
        let version;

        if (requestedVersion) {
            console.log(`Attempting to install specified dust version: ${requestedVersion}`);
            version = requestedVersion;
        } else {
            console.log('No version specified, fetching the latest.');
            version = latestVersion;
        }

        console.log(`Using dust version: ${version}`);
        const baseUrl = `https://github.com/bootandy/dust/releases/download/`;

        const platform = process.platform;
        const arch = process.arch;

        // Find the matching target for the current host
        // Compose the asset identifier based on host platform and arch
        let identifier;
        if (platform === 'win32') {
            if (arch === 'x64') {
                identifier = 'x86_64-pc-windows-msvc';
            } else if (arch === 'ia32') {
                identifier = 'i686-pc-windows-msvc';
            }
        } else if (platform === 'linux') {
            if (arch === 'x64') {
                identifier = 'x86_64-unknown-linux-musl';
            } else if (arch === 'ia32') {
                identifier = 'i686-unknown-linux-musl';
            } else if (arch === 'arm64') {
                identifier = 'aarch64-unknown-linux-musl';
            } else if (arch === 'arm') {
                identifier = 'arm-unknown-linux-musleabi';
            }
        } else if (platform === 'darwin') {
            if (arch === 'x64') {
                identifier = 'x86_64-apple-darwin';
            }
        }

        if (!identifier) {
            throw new Error(`Unsupported platform/architecture: ${platform}-${arch}`);
        }

        let assetName = getAssetName(version, platform, identifier);
        let url = `${baseUrl}/${version}/${assetName}`;

        if (fs.existsSync(binPath)) {
            fs.rmSync(binPath, { recursive: true, force: true });
        }
        fs.mkdirSync(binPath);

        let succeeded = await downloadAndExtract(url, platform, arch);
        if (!succeeded) {
            // fallback to latest version if download failed
            console.log(`Failed to download ${assetName}. Falling back to latest version.`);
            assetName = getAssetName(latestVersion, platform, identifier);
            url = `${baseUrl}/${latestVersion}/${assetName}`;
            succeeded = await downloadAndExtract(url, platform, arch);
            if (!succeeded) {
                throw new Error(`Failed to download the latest version ${latestVersion}`);
            }
        }

    } catch (error) {
        console.error('An error occurred during the download process:', error);
        process.exit(1);
    }
}

main();