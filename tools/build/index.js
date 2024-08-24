import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

import puppeteer from 'puppeteer';
import YAML from 'yaml';

const DEBUG = true;

const urlOptions = {
    'bugcrowd.com' : {
        height: 1080 * 2,
    }
}

async function* walk(dir) {
    for await (const d of await fs.promises.opendir(dir)) {
        const entry = path.join(dir, d.name);
        if (d.isDirectory()) yield* walk(entry);
        else if (d.isFile() && path.extname(d.name) == ".yaml") yield entry;
    }
}


function getList(value) {
    if (Array.isArray(value)) {
        return value;
    }
    if (value != null) {
        return [value];
    }
    return [];
}

async function processScreenshot(url, output) {
    console.log(`Screenshotting ${url} -> ${output}`);
    const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
        timeout: 10000,
    });
    try {
        const page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
            ...(urlOptions[new URL(url).hostname] || {}),
        });
        await page.goto(url);
        await page.waitForNavigation({ timeout: 5000, waitUntil: 'networkidle2' }).catch(() => {});
        await page.screenshot({ path: output, fullPage: true });
    }
    finally {
        await browser.close();
    }
}

async function processAssets(event, keys) {
    for (let key of keys) {
        if (event[key] == undefined) {
            continue;
        }
        await fs.promises.stat(`./assets/${key}`).catch(() => fs.promises.mkdir(`./assets/${key}`));
        let asset = event[key];
        let hash = createHash('sha256').update(asset).digest('hex');
        console.log(`${event.id}: ${key} asset ${asset} -> ${hash}`);

        // Check if the asset already exists
        let exists = (await Promise.all([
            fs.promises.stat(`./assets/${key}/${hash}.png`).catch(() => false),
            fs.promises.stat(`./assets/${key}/${hash}.jpg`).catch(() => false),
        ])).some((r) => r != false);
        if (exists) {
            continue;
        }

        let r = await fetch(asset);
        if (r.status != 200) {
            console.error(`${event.id}: Failed to fetch ${key} asset ${asset}`);
            continue;
        }

        let content_type = r.headers.get('content-type');
        if (content_type == null) {
            // For now assume a png content type
            content_type = 'image/png';
        }

        if (content_type.startsWith('image/')) {
            let ext = {
                'image/png': '.png',
                'image/jpeg': '.jpg',
                'image/gif': '.gif',
            }[content_type];
            if (ext == undefined) {
                console.error(`${event.id}: Unsupported image type ${content_type}`);
                continue;
            }

            await fs.promises.writeFile(`./assets/${key}/${hash}${ext}`, Buffer.from(await r.arrayBuffer()));
        }
        if (content_type.startsWith('text/html')) {
            await processScreenshot(asset, `./assets/${key}/${hash}.png`);
        }
    }
}

function processEventHackers(event, hackers) {

    for (let award of Object.keys(event.awards)) {
        for (let hacker of getList(event.awards[award])) {
            if (hackers[hacker] == undefined) {
                hackers[hacker] = {
                    id: hacker,
                };
            }
            if (hackers[hacker][event.id] == undefined) {
                hackers[hacker][event.id] = {};
            }
            hackers[hacker][event.id][award] = true;
        }
    }
}

async function processYaml(dir, processor) {
    for await (const p of walk(dir)) {
        try {
            const file = await fs.promises.readFile(p, 'utf8');
            const id = path.basename(p, '.yaml');
            await processor({id, ...YAML.parse(file)});
        }
        catch (e) {
            throw new Error(`Exception processing ${p}`, { cause: e });
        }
    }
}

async function main() {
    const cwd = process.cwd();
    let hackers = {};
    let events = {};
    try {
        // Setup the working directory
        process.chdir('../../');
        await fs.promises.rm('./dist', { recursive: true, force: true });
        await fs.promises.mkdir('./dist');
        await fs.promises.mkdir('./assets').catch(() => {});
        

        // Alias renamed hackers
        await processYaml('./hackers/', async (hacker) => { 
            hackers[hacker.id] = {
                id: hacker.id,
                alias: getList(hacker.alias),
            }
            for (let alias of getList(hacker.alias)) {
                hackers[alias] = hackers[hacker.id];
            }

        });
        await processYaml('./events/', async (event) => {
            events[event.id] = event;
            [event.year, event.month] = event.id.split('-');
            processEventHackers(event, hackers);
            await processAssets(event, ['art', 'leaderboard']);
        });

        

        // Output rendered objects to dist
        process.chdir('./dist');
        await fs.promises.stat('./hackers').catch(() => fs.promises.mkdir('./hackers'));
        for (let hacker_id of Object.keys(hackers)) {
            let hacker = hackers[hacker_id];
            await fs.promises.writeFile(`./hackers/${hacker_id}.json`, JSON.stringify(hacker, null, DEBUG ? 2 : null));
        }
        
        const hackerIndex = Array.from(Object.keys(hackers)).map(id => { 
            if (hackers[id].id != id) {
                return null;
            }
            return { id, alias: getList(hackers[id].alias)}
        }).filter(e => e != null);
        await fs.promises.writeFile(`./hackerIndex.json`, JSON.stringify(hackerIndex, null, DEBUG ? 2 : null));

        await fs.promises.stat('./events').catch(() => fs.promises.mkdir('./events'));
        for (let event of Object.values(events)) {
            await fs.promises.writeFile(`./events/${event.id}.json`, JSON.stringify(event, null, DEBUG ? 2 : null));
        }

        const eventIndex = Object.keys(events).map(id => { 
            return { 
                id, 
                platform: events[id].platform, 
                title: events[id].title,
                year: events[id].year,
                month: events[id].month,
            };
        });
        await fs.promises.writeFile(`./eventIndex.json`, JSON.stringify(eventIndex, null, DEBUG ? 2 : null));

    }
    finally {
        process.chdir(cwd);
    }

    console.log(hackers["nahamsec"]);
}
main();