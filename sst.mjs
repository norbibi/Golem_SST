import { TaskExecutor } from "@golem-sdk/golem-js";
import { program, Option } from "commander";
import crypto from "crypto";
import { readFile } from 'fs/promises';
import { exec } from 'child_process';
import puppeteer from 'puppeteer';
import fs from 'fs';

var logStream = fs.createWriteStream('gpu_providers.txt', {flags: 'w'});

const whitelistedProvidersId = [  '0x72644ae077ba12c39eeb7bda5419e6189ad25be6', '0x72770bff6ec101e4bdc64f9cff489099d4e37423', '0x50a6612d55f95ea34f3f82b189ee33dba34c44c4',
                                  '0xe97cd5f6fdd8694d1e3019607f39b0ef68554c0a', '0xed8ac54779b567eb675da91d85c7fe107715bdcf', '0xd46b81996e7c8a7002ab66b26957b5d47cac980f',
                                  '0x0cef47ff5fd7fa73d75a553110ee07c60d06a69a', '0x22901e957516b876ec6d5bd6b63c4e99cd7bbb7d', '0x85283261d65300e0f05d9b36ebe60b18db880bf2',
                                  '0x4f0d2da44fb8b77c823aa417fca4fe6fc2bff3ea', '0x8f82743824fd18c99a5d4341e3fffb711d190d31']

function configure_audio() {
  exec('pactl list | grep Golem_Virtual_Speaker', (error, stdout, stderr) => {
    if(stdout == "") {
      exec('pactl load-module module-null-sink sink_name=golem_virtual_speaker sink_properties=device.description=Golem_Virtual_Speaker', (error, stdout, stderr) => {
        exec('pactl list | grep Golem_Microphone', (error, stdout, stderr) => {
          if(stdout == "")
            exec('pactl load-module module-remap-source master=golem_virtual_speaker.monitor source_name=golem_virtual_speaker source_properties=device.description=Golem_Microphone', null);
        });
      });
    }
  });
  exec('pactl list | grep Golem_Speaker', (error, stdout, stderr) => {
    if(stdout == "") {
      exec('pactl load-module module-null-sink sink_name=golem_speaker sink_properties=device.description=Golem_Speaker', (error, stdout, stderr) => {
        exec('pactl list | grep Golem_Virtual_Microphone', (error, stdout, stderr) => {
          if(stdout == "")
            exec('pactl load-module module-remap-source master=golem_speaker.monitor source_name=golem_speaker source_properties=device.description=Golem_Virtual_Microphone', null);
        });
      });
    }
  });
}

var g_maxStartPrice;
var g_maxCpuPricePerHour;
var g_maxEnvPricePerHour;
var g_providerId;
var g_useOnlyWhitelisted;

const myFilter = async (proposal) => {

  var cpuPriceperHour   = proposal.properties['golem.com.pricing.model.linear.coeffs'][0]*3600;
  var envPricePerHour   = proposal.properties['golem.com.pricing.model.linear.coeffs'][1]*3600;
  var startPricePerHour = proposal.properties['golem.com.pricing.model.linear.coeffs'][2];

  var gpuMemoryGb       = proposal.properties['golem.!exp.gap-35.v1.inf.gpu.memory.total.gib']
  var gpuModel          = proposal.properties['golem.!exp.gap-35.v1.inf.gpu.model']

  var cpuModel          = proposal.properties['golem.inf.cpu.brand']
  var cpuThreads        = proposal.properties['golem.inf.cpu.threads']
  var ram               = proposal.properties['golem.inf.mem.gib']
  var storage           = proposal.properties['golem.inf.storage.gib']

  logStream.write(`ProviderName:            ${proposal.provider.name}\n`);
  logStream.write(`ProviderId:              ${proposal.provider.id}\n`);
  logStream.write(`cpuPriceperHour (GLM):   ${cpuPriceperHour}\n`);
  logStream.write(`envPricePerHour (GLM):   ${envPricePerHour}\n`);
  logStream.write(`startPricePerHour (GLM): ${startPricePerHour}\n`);
  logStream.write(`cpuModel:                ${cpuModel}\n`);
  logStream.write(`cpuThreads:              ${cpuThreads}\n`);
  logStream.write(`RAM (GB):                ${ram}\n`);
  logStream.write(`Storage (GB):            ${storage}\n`);
  logStream.write(`gpuModel:                ${gpuModel}\n`);
  logStream.write(`gpuMemoryGb:             ${gpuMemoryGb}\n\n`);

  if((startPricePerHour <= g_maxStartPrice) && (cpuPriceperHour <= g_maxCpuPricePerHour) && (envPricePerHour <= g_maxEnvPricePerHour) && (gpuMemoryGb >= 12) && (ram >= 10))
  {
    if(g_providerId != '')
    {
      if(proposal.provider.id == g_providerId)
        return true;
    }
    else if(g_useOnlyWhitelisted)
    {
      if(whitelistedProvidersId.includes(proposal.provider.id))
        return true;
    }
    else
      return true;
  }

  return false;
};

async function main(subnet, driver, network, budget, maxStartPrice, maxCpuPricePerHour, maxEnvPricePerHour, inputLanguage, outputLanguage, providerId, useOnlyWhitelisted, debug) {

  g_maxStartPrice      = maxStartPrice;
  g_maxCpuPricePerHour = maxCpuPricePerHour;
  g_maxEnvPricePerHour = maxEnvPricePerHour;
  g_providerId         = providerId;
  g_useOnlyWhitelisted = useOnlyWhitelisted;

  console.log('\n############################## My parameters: ##############################');
  console.log('budget:             ', budget);
  console.log('maxStartPrice:      ', maxStartPrice);
  console.log('maxCpuPricePerHour: ', maxCpuPricePerHour);
  console.log('maxEnvPricePerHour: ', maxEnvPricePerHour);
  console.log('inputLanguage:      ', inputLanguage);
  console.log('outputLanguage:     ', outputLanguage);
  console.log('providerId:         ', providerId);
  console.log('useOnlyWhitelisted: ', useOnlyWhitelisted);
  console.log('############################################################################\n');

  const manifest = await readFile(`./manifest.json`);

  var myEventTarget = new EventTarget();

  myEventTarget.addEventListener("GolemEvent", (e) => {
    if(e.name == 'AgreementCreated')
      console.log('\nAGREEMENT_CREATED, agreementId:', e.detail.id, ', providerId:', e.detail.providerId, ', providerName:', e.detail.providerName, '\n');
    else if(e.name == 'AgreementConfirmed')
      console.log('AGREEMENT_CONFIRMED, agreementId:', e.detail.id, ', providerId:', e.detail.providerId, '\n');
    else if(e.name == 'AgreementRejected')
      console.log('AGREEMENT_REJECTED, agreementId:', e.detail.id, ', providerId:', e.detail.providerId, ', reason:', e.detail.reason, '\n');
    else if(e.name == 'AgreementTerminated')
      console.log('AGREEMENT_TERMINATED, agreementId:', e.detail.id, ', providerId:', e.detail.providerId, ', reason:', e.detail.reason, '\n');
    else if(e.name == 'InvoiceReceived')
      console.log('\nINVOICE_RECEIVED, agreementId:', e.detail.agreementId, ', providerId:', e.detail.providerId, ', amount:', e.detail.amount, ', wallet:', e.detail.payeeAddr, '\n');
  });

  const executor = await TaskExecutor.create({
    proposalFilter: myFilter,
    capabilities: ["vpn", "!exp:gpu", "manifest-support"],
	  engine: "vm-nvidia",
    maxParallelTasks: 1,
    subnetTag: subnet,
    payment: { driver, network },
    budget: budget,
    //logLevel: "debug",
    networkIp: "192.168.0.0/24",
    taskTimeout: 60*60*1000,
    manifest: manifest.toString('base64'),
    eventTarget: myEventTarget
  });

  const appKey = process.env["YAGNA_APPKEY"];

  try {
    await executor.run(async (ctx) => {

      const remote_hostname = crypto.randomBytes(10).toString("hex");
      const password = crypto.randomBytes(3).toString("hex");

      const results = ctx
        .beginBatch()
        .run("syslogd")
        .run("ssh-keygen -A")
        .run(`echo '${password}\n${password}' | passwd`)
        .run("/usr/sbin/sshd")
        .run("/root/start.sh")
        .end();

      console.log('\nStarting App');

      await new Promise((res) => setTimeout(res, 60000));

      exec(`sshpass -p ${password} ssh -N -L localhost:8000:localhost:8000 -o ProxyCommand='websocat asyncstdio: ${ctx.getWebsocketUri(22)} --binary -H=Authorization:"Bearer ${appKey}"' -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no root@${remote_hostname}`, null);
      exec(`sshpass -p ${password} ssh -N -L localhost:8001:localhost:8001 -o ProxyCommand='websocat asyncstdio: ${ctx.getWebsocketUri(22)} --binary -H=Authorization:"Bearer ${appKey}"' -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no root@${remote_hostname}`, null);

      let browser = null;
      if(debug)
        browser = await puppeteer.launch({headless: false, args: ['--use-fake-ui-for-media-stream', '--window-size=700,1300'], defaultViewport: null});
      else
        browser = await puppeteer.launch({ignoreDefaultArgs: ['--mute-audio'], args: ['--use-fake-ui-for-media-stream', '--window-size=700,1300'], defaultViewport: null});

      const searchResultSelector = '#startStreaming';
      const searchResultSelector2 = '#stopStreaming';

      const page1 = await browser.newPage();
      await page1.goto(`http://localhost:8000/?roomID=BBCD&autoJoin&VirtualPort=Golem_Virtual_Speaker&TargetLanguage=${outputLanguage}`, {waitUntil: "networkidle0"});
      await new Promise((res) => setTimeout(res, 5000));
      await page1.waitForSelector(searchResultSelector, {timeout: 0});
      await page1.click(searchResultSelector);
      await page1.waitForSelector(searchResultSelector2, {timeout: 0});

      const page2 = await browser.newPage();
      await page2.goto(`http://localhost:8001/?roomID=BBCD&autoJoin&VirtualPort=Golem_Virtual_Microphone&TargetLanguage=${inputLanguage}`, {waitUntil: "networkidle0"});
      await new Promise((res) => setTimeout(res, 5000));
      await page2.waitForSelector(searchResultSelector, {timeout: 0});
      await page2.click(searchResultSelector);
      await page2.waitForSelector(searchResultSelector2, {timeout: 0});

      console.log('\nGolem_Speaker & Golem_Microphone are ready to use :)\n');

      if(debug)
      {
        console.log(`You can connect via ssh to provider "${ctx.provider?.name}" with:`);
        console.log(`sshpass -p ${password} ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o ProxyCommand='websocat asyncstdio: ${ctx.getWebsocketUri(22)} --binary -H=Authorization:"Bearer ${appKey}"' root@${remote_hostname}\n`);
      }

      let isClosing = false;
      const stopTask = async () => {
        if (isClosing) {
          console.log("Already closing, ignoring subsequent shutdown request");
          return;
        }

        isClosing = true;

        console.log("Shutting down gracefully");
        logStream.end();
      };

      return new Promise((res) => {
        process.on("SIGINT", () => stopTask().then(() => res()));
      });
    });
  } catch (error) {
    console.error("Computation failed:", error);
  } finally {
    await executor.shutdown();
  }
}

const languages = [ 'eng', 'arb', 'ben', 'cat', 'ces', 'cmn', 'cym', 'dan', 'deu', 'est', 'fin', 'fra', 'hin', 'ind', 'ita', 'jpn',
                    'kor', 'mlt', 'nld', 'pes', 'pol', 'por', 'ron', 'rus', 'slk', 'spa', 'swe', 'swh', 'tel', 'tgl', 'tha', 'tur',
                    'ukr', 'urd', 'uzn', 'vie'];

const msg_available_languages = 'Available languages:\n\n\
English (eng),\n\
Arabic (arb),\n\
Bengali (ben),\n\
Catalan (cat),\n\
Czech (ces),\n\
Chinese (cmn),\n\
Welsh (cym),\n\
Danish (dan),\n\
German (deu),\n\
Estonian (est),\n\
Finnish (fin),\n\
French (fra),\n\
Hindi (hin),\n\
Indonesian (ind),\n\
Italian (ita),\n\
Japanese (jpn),\n\
Korean (kor),\n\
Maltese (mlt),\n\
Dutch (nld),\n\
Persian (pes),\n\
Polish (pol),\n\
Portuguese (por),\n\
Romanian (ron),\n\
Russian (rus),\n\
Slovak (slk),\n\
Spanish (spa),\n\
Swedish (swe),\n\
Swahili (swh),\n\
Telugu (tel),\n\
Tagalog (tgl),\n\
Thai (tha),\n\
Turkish (tur),\n\
Ukrainian (ukr),\n\
Urdu (urd),\n\
Uzbek (uzn),\n\
Vietnamese (vie)'

program
  .helpOption('--help', msg_available_languages)
  .option('--subnet <subnet>', 'subnet', 'public')
  .addOption(new Option('--paymentDriver <paymentDriver>').choices(['erc20', 'erc20next']).default('erc20'))
  .addOption(new Option('--paymentNetwork <paymentNetwork>').choices(['polygon', 'mainnet']).default('polygon'))
  .option("--budget <budget>", "budget", Number, 2)
  .option("--maxStartPrice <maxStartPrice>", "maxStartPrice", Number, 0)
  .option("--maxCpuPricePerHour <maxCpuPricePerHour>", "maxCpuPricePerHour", Number, 0)
  .option("--maxEnvPricePerHour <maxEnvPricePerHour>", "maxEnvPricePerHour", Number, 2)
  .addOption(new Option('--inputLanguage <inputLanguage>').choices(languages).default('fra'))
  .addOption(new Option('--outputLanguage <outputLanguage>').choices(languages).default('eng'))
  .option('--providerId <providerid>', 'providerid', '')
  .option('--useOnlyWhitelisted', 'useOnlyWhitelisted', true)
  .option('--debug', 'debug', false)
program.parse();
const options = program.opts();

configure_audio();

main( options.subnet, options.paymentDriver, options.paymentNetwork, options.budget, options.maxStartPrice, options.maxCpuPricePerHour, options.maxEnvPricePerHour, options.inputLanguage,
      options.outputLanguage, options.providerId, options.useOnlyWhitelisted, options.debug);

// node sst.mjs --subnet public --useOnlyWhitelisted true