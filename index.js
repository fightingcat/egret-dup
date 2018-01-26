const fs = require('fs');
const path = require('path');
const download = require('download');
const program = require('commander');

program.version('0.0.1');

program
    .usage('<url> [dir]')
    .arguments('<url> [dir]')
    .option('-t, --timeout <n>')
    .option('-r, --retry <n>')
    .action(downloadRes);

program.parse(process.argv);

async function downloadRes(url, dir) {
    const options = {
        timeout: program.timeout || 3600000,
        retries: program.retries || 10
    };
    const baseURL = path.dirname(url);
    const outDir = path.resolve(dir || 'egret_res_download');
    const json = await download(url, outDir, options).then(JSON.parse);

    let current = 0, total = json.resources.length;
    let success = 0, failure = 0;

    for (const res of json.resources) {
        const url = baseURL + '/' + res.url;
        const dest = path.resolve(outDir, path.dirname(res.url));

        try {
            console.log(`Downloading (${++current}/${total}): ${res.url}`);
            const fileName = path.basename(url.substring(0, url.lastIndexOf('?')));
            const filePath = path.resolve(dest, fileName);
            const data = !fs.existsSync(filePath) && await download(url, dest, options);
            success++;

            if (res.type == 'sheet' || res.type == 'fnt') {
                try {
                    const jsonData = data || fs.readFileSync(filePath, { encoding: 'utf8' });
                    const texFile = JSON.parse(jsonData).file;
                    const texURL = path.dirname(url) + '/' + texFile;

                    console.log(`Downloading (${++current}/${++total}): ${texURL}`);
                    await download(texURL, dest, options);
                    success++;

                } catch (e) {
                    console.log(`   Failed download relative file. Error: ${e}\n`);
                    failure++;
                }
            }
        } catch (e) {
            console.log(`   Failed download file. Error: ${e}\n`);
            failure++;
        }
    }
    console.log(`\n\nDownload complete! (Sucess: ${success}, Failure: ${failure})\n`);
}