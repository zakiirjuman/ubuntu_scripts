// This function takes the config object and creates a shell script that will be executed by the cron job.
// It returns the path to the shell script and the cron entry as well as the original config object.

// Promisify writeFile
const fs = require('fs');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);

async function createShellScript(config = {}, shell_script_folder) {
    let {archive_name, archive_extension, archive_destination, backup_paths, username, cron_schedule} = config;

    if(!archive_name || !archive_extension || !archive_destination || !backup_paths || !username){
        return Promise.reject(new Error('Config is invalid'));
    }

    if (!shell_script_folder){
        return Promise.reject(new Error('Shell script folder is not specified'));
    }

    // Test that the shell script folder exists
    try {
        await fs.promises.access(shell_script_folder);
    } catch (err) {
        return Promise.reject(new Error(`Shell script folder ${shell_script_folder} does not exist`));
    }

    // Define the variables
    let destination_path = `${archive_destination}/${archive_name}${archive_extension}`;
    let backup_paths_string = backup_paths.join(' -P ');

    // Define the shell script
    let shell_script = `#!/bin/bash\ntar -czf ${destination_path} -P ${backup_paths_string}\nchown ${username}:${username} ${destination_path}\n`;

    // Write the shell script to a file and return the script_path and cron_schedule
    let script_path = `${shell_script_folder}/${username}/${archive_name}`;

    // Create script folder if it does not exist
    try {
        await fs.promises.access(`${shell_script_folder}/${username}`);
    } catch (err) {
        await fs.promises.mkdir(`${shell_script_folder}/${username}`, {recursive: true});
    }
    let cron_entry = cron_schedule + ' root ' + script_path;
    return writeFile(`${script_path}`, shell_script)
    .then(() => {
        return fs.promises.chmod(script_path, '755');
    })
    .then(() => {
        return {script_path, cron_entry, destination_path, ...config};
    });

}

module.exports = createShellScript;