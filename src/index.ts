import { spawn, SpawnOptions } from "child_process";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

/**
 * Resolves the path to the dust binary based on the current platform.
 * The binary is expected to be located in the 'bin' directory at the project root.
 * The binary is renamed to 'dust' or 'dust.exe' during the post-install process.
 * @returns {string} The full path to the dust binary.
 */
export const getDustBinaryPath = (): string => {
  const platform = os.platform(); // 'darwin', 'linux', 'win32'

  // The binary is renamed to 'dust' or 'dust.exe' during the post-install process.
  const binaryName = platform === "win32" ? "dust.exe" : "dust";

  // Use import.meta.url to correctly resolve file paths in an ES Module context.
  let __dirname = path.dirname(fileURLToPath(import.meta.url));

  // The compiled index.js will be in the dist/ directory, so we go up one level to the project root.
  const binaryPath = path.join(__dirname, "..", "bin", binaryName);

  return binaryPath;
};

const defaultBinaryPath = getDustBinaryPath();

// --- Main Function Interfaces ---

/**
 * Encapsulates the final result of a command execution.
 */
export interface DustResult {
  /** The standard output (stdout) from the command. */
  stdout: string;
  /** The standard error (stderr) from the command. */
  stderr: string;
  /** The exit code of the process. Will be null if the process was terminated by a signal. */
  code: number | null;
  /** The Error object if the process failed to spawn. */
  error?: Error;
}

/**
 * Defines the optional parameters for the nodeDust function, including
 * real-time data callbacks and native spawn options.
 */
export interface NodeDustOptions {
  /** * A dictionary of options to pass directly to the underlying `child_process.spawn` call.
   * For example, `{ cwd: '/path/to/start' }`.
   */
  spawnOptions?: SpawnOptions;
  /** Callback function to handle stdout data in real-time. */
  onStdOut?: (data: string) => void;
  /** Callback function to handle stderr data (e.g., progress) in real-time. */
  onStdErr?: (data: string) => void;
  /** The path to the dust binary. Defaults to the one resolved by getBinaryPath(). */
  binaryPath?: string;
}

// --- Main Function (Refactored) ---

/**
 * Asynchronously executes the dust command with the given arguments and options.
 * @param args - An array of string arguments to pass to the dust command. E.g., ['-d', '1']
 * @param options - An optional object containing spawn options and real-time data callbacks.
 * @returns A Promise that resolves to a DustResult object containing the final stdout, stderr, and exit code.
 */
export function nodeDust(
  args: string[],
  options: NodeDustOptions = {}
): Promise<DustResult> {
  return new Promise((resolve) => {
    // Destructure the options for clarity
    const {
      spawnOptions = {},
      onStdOut,
      onStdErr,
      binaryPath = defaultBinaryPath,
    } = options;

    const child = spawn(binaryPath, args, spawnOptions);

    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        // If a callback is provided, call it in real-time
        if (onStdOut) {
          onStdOut(chunk);
        }
        // Also, accumulate for the final result
        stdout += chunk;
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (data) => {
        const chunk = data.toString();
        // If a callback is provided, call it in real-time
        if (onStdErr) {
          onStdErr(chunk);
        }
        // Also, accumulate for the final result
        stderr += chunk;
      });
    }

    // The 'error' event is emitted if the process could not be spawned.
    child.on("error", (err) => {
      // This typically means the binary is missing, lacks execute permissions, or there's an issue with spawnOptions (e.g., cwd doesn't exist).
      resolve({ stdout, stderr, code: 1, error: err });
    });

    // The 'close' event is emitted after a process has ended and its stdio streams have been closed.
    child.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });
  });
}

// Provide a default export for convenience.
export default nodeDust;
