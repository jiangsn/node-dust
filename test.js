import { nodeDust } from './dist/index.js';
// Or: import nodeDust from './dist/index.js';

async function runTest() {
    console.log('--- Testing --version ---');
    const versionResult = await nodeDust(['--version']);
    if (versionResult.error) {
        console.error('Test failed with a spawn error:', versionResult.error);
        console.error('Stderr:', versionResult.stderr);
        return;
    }
    console.log(versionResult.stdout);


    console.log('\n--- Testing on current directory (.) ---');
    const dirResult = await nodeDust(['.']);
    if (dirResult.error) {
        console.error('Test failed with a spawn error:', dirResult.error);
        return;
    }
    console.log('Stdout:', dirResult.stdout);


    console.log('\n--- Testing on current directory (.) with JSON output ---');
    const jsonResult = await nodeDust(['-j', '-o', 'b', '.']);
    if (jsonResult.error) {
        console.error('Test failed with a spawn error:', jsonResult.error);
        return;
    }
    // In case stdout might not be valid JSON.
    try {
        console.log('Stdout (parsed JSON):', JSON.parse(jsonResult.stdout));
    } catch (e) {
        console.error('Test failed: Could not parse JSON from stdout.', e);
        console.log('Raw stdout was:', jsonResult.stdout);
    }


    console.log('\n--- Testing a command error (invalid argument) ---');
    const invalidResult = await nodeDust(['.', '--invalid-arg']);
    if (invalidResult.error) {
        // This is not expected, as the process should spawn and then exit with an error code.
        console.error('Test failed with an unexpected spawn error:', invalidResult.error);
    } else if (invalidResult.code !== 0) {
        console.log('Test passed: Command failed with a non-zero exit code as expected.');
        console.log('Stderr:', invalidResult.stderr);
        console.log('Exit Code:', invalidResult.code);
    } else {
        console.error('Test failed: Command succeeded unexpectedly.');
    }


    console.log('\n--- Testing a spawn error (should be handled) ---');
    const spawnErrorResult = await nodeDust(['.'], {
        spawnOptions: {
            cwd: '/non/existent/path/for/testing/spawn/error'
        }
    });
    if (spawnErrorResult.error) {
        console.log('Test passed: Caught expected spawn error in result object.');
        console.log("Error code:", spawnErrorResult.error.code);
        console.log('Error message:', spawnErrorResult.error.message);
    } else {
        console.error('Test failed: The result object did not contain an error as expected.');
    }


    console.log('\n--- Testing progress (stderr) on root directory (/) ---');
    console.log('`Indexing: / xxxx files, ...` should shown below.');
    const progressResult = await nodeDust(['/'], {
        onStdErr: (data) => {
            process.stdout.write(data);
        }
    });
    // Add a newline to separate the progress output from the final summary.
    console.log('\nScan complete.');

    if (progressResult.error) {
        console.error('Test failed with a spawn error during progress test:', progressResult.error);
        return;
    }

    console.log('Final Stdout (top-level summary):');
    console.log(progressResult.stdout);
    console.log('Final Exit Code:', progressResult.code);
}

runTest();

