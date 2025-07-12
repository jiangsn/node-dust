#  node-dust

A simple, fast, and modern Node.js wrapper for the powerful [`dust`](https://github.com/bootandy/dust) disk usage analyzer.

This package bundles the `dust` binary, so no external installation is required. It works out of the box by downloading the appropriate binary for your platform and architecture during installation.

##  Key Features

-  **Zero Dependencies:** End-users don't need to install `dust` themselves.
-  **Promise-Based API:** Uses a modern `async/await` friendly interface.
-  **Full Parity:** Accepts all command-line arguments that the original `dust` CLI does.
-  **Detailed Results:** Provides `stdout`, `stderr`, the `exit code`, and spawn `errors`.
-  **Real-time Streaming:** Supports callbacks for real-time progress updates from `stderr` and `stdout`.
-  **TypeScript Ready:** Fully written in TypeScript with type definitions included.
-  **EM First:** Designed as a native ES Module.

---

##  Installation
The first time you install the package, it will download the correct `dust` binary for your system.

```bash
npm install node-dust
```


### Install a Specific `dust` Version
You can specify a particular version of dust by passing the --dust-ver flag. If you don't provide a version or the specified version doesn't exist, the latest stable version will be installed automatically.

```Bash
# Example: Install with a specific version of the dust binary
npm install node-dust --dust-ver=v1.2.0

# Example: Switch dust version after node-dust is installed
npm rebuild node-dust --dust_ver=v1.2.2

# Example: Upgrade dust binary to the latest version
npm rebuild node-dust
```

---

##  Usage

###  Basic Example

Simply import the `nodeDust` function and pass an array of arguments, just as you would on the command line.

```javascript
import { nodeDust } from 'node-dust';

async function analyzeDirectory() {
    // Equivalent to running dust . in your terminal
    const result = await nodeDust(['.']);

    if (result.code === 0) {
        console.log('Disk Usage Analysis:');
        console.log(result.stdout);
    } else {
        // dust reports errors on stderr
        console.error('An error occurred:');
        console.error(result.stderr);
    }
}

analyzeDirectory();
```

###  JSON Output

For programmatic use, `dust`'s JSON output is incredibly useful.

```javascript
import { nodeDust } from 'node-dust';

async function getJsonReport() {
    // Use '--output-json' or '-j' for JSON outputs
    const { stdout, code } = await nodeDust(['-j', '.']);

    if (code === 0) {
        const report = JSON.parse(stdout);
        console.log('Parsed JSON: ', report);
    }
}

getJsonReport();
```

###  Real-time Progress Updates

`dust` prints its scanning progress to `stderr`. You can capture this in real-time using the `onStdErr` callback, which is great for long-running analyses.

```javascript
import { nodeDust } from 'node-dust';

console.log('Starting a large scan on the root directory...');

const result = await nodeDust(['/'], {
    onStdErr: (data) => {
        // Write progress directly to the console without a newline
        process.stdout.write(data);
    }
});

// Add a final newline for clean formatting
console.log('Scan complete.');

console.log('--- Final Result ---');
console.log(result.stdout);
```

###  Error Handling

The wrapper distinguishes between **command errors** (e.g., invalid arguments) and **spawn errors** (e.g., binary is missing or `cwd` is invalid).

```javascript
import { nodeDust } from 'node-dust';

async function testErrors() {
    // 1. Test a command error (dust exits with a non-zero code)
    const invalidArgResult = await nodeDust(['--invalid-argument']);
    if (invalidArgResult.code !== 0) {
        console.log('✅ Caught command error as expected.');
        console.error(invalidArgResult.stderr);
    }

    // 2. Test a spawn error (the process fails to start)
    const spawnErrorResult = await nodeDust(['.'], {
        spawnOptions: { cwd: '/path/does/not/exist' }
    });
    if (spawnErrorResult.error) {
        console.log('✅ Caught spawn error as expected.');
        console.error(spawnErrorResult.error.message);
    }
}

testErrors();
```

---

##  API Reference

###  `nodeDust(args[, options])`

-  **`args`**: `string[]` - **Required**. An array of command-line arguments to pass to `dust`.
-  **`options`**: `NodeDustOptions` - **Optional**. An object for advanced configuration.
-  **Returns**: `Promise<DustResult>`

###  `NodeDustOptions`

An object with the following optional properties:

-  **`spawnOptions`**: `child_process.SpawnOptions`. A dictionary of options to pass directly to the underlying `child_process.spawn` call. For example, `{ cwd: '/path/to/start' }`.
-  **`onStdOut`**: `(data: string) => void`. Callback function to handle `stdout` data in real-time as it arrives.
-  **`onStdErr`**: `(data: string) => void`. Callback function to handle `stderr` data in real-time. Useful for progress bars.

###  `DustResult`

The `Promise` returned by `nodeDust` resolves to an object with this structure:

-  **`stdout`**: `string`. The accumulated standard output from the command.
-  **`stderr`**: `string`. The accumulated standard error output from the command.
-  **`code`**: `number | null`. The exit code of the process. `0` indicates success. `null` means the process was terminated by a signal.
-  **`error`**: `Error | undefined`. The `Error` object if the process failed to spawn entirely. If the process starts but exits with an error code, this will be `undefined`.

---

##  License
Published under [MIT Lience](https://opensource.org/licenses/MIT).