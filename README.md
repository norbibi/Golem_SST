
# Golem SST

This application allows you to converse in your native language with someone speaking another language.  
It runs on Golem Network with GPU providers and works with the usual chat tools (Dicord, Teams, Duo, etc.).  
To do this, it presents the Golem Microphone and Golem_Speaker audio inputs/outputs to configure in the chat application.  

<p>
  <img src="screenshots/Meet_audio_config.png" width="49%"">
&nbsp; 
  <img src="screenshots/Discord_audio_config.png" width="49%">
</p>

This application is based on Meta's Seamless Communication AI model (https://huggingface.co/spaces/facebook/seamless-streaming).  
Meta's model aims to preserve the subtleties of discourse such as pauses and speaking rate in addition to vocal style and emotional tone.  

<p align="center">
<img src="screenshots/SST.png" width="100%"> 
</p>

This tool is only for LINUX requestor.  

**Requirements:**  
 - Yagna requestor with funds (GLM on Polygon network)  
 - nodejs  
 - nodejs packages @golem-sdk/golem-js, commander, puppeteer, crypto  
 - ssh, sshpass  
 - pulseaudio (pactl)  

**How to use:**  

```
git clone https://github.com/norbibi/Golem_SST
cd Golem_SST
node sst.mjs
``` 

Parameters:  

- --subnet <subnet>                          subnet (default: "public")  
- --paymentDriver <paymentDriver>            (choices: "erc20", "erc20next", default: "erc20")  
- --paymentNetwork <paymentNetwork>          (choices: "polygon", "mainnet", default: "polygon")  
- --budget <budget>                          budget (default: 2)  
- --maxStartPrice <maxStartPrice>            maxStartPrice (default: 0)  
- --maxCpuPricePerHour <maxCpuPricePerHour>  maxCpuPricePerHour (default: 0)  
- --maxEnvPricePerHour <maxEnvPricePerHour>  maxEnvPricePerHour (default: 2)  
- --inputLanguage <inputLanguage>            (choices: See below for supported languages)  
- --outputLanguage <outputLanguage>          (choices: See below for supported languages)  
- --providerId <providerid>                  providerid (default: "")  
- --useOnlyWhitelisted                       useOnlyWhitelisted (default: true)  
- --debug                                    debug (default: false)  

Supported languages:  

     English (eng), Arabic (arb), Bengali (ben), Catalan (cat), Czech (ces), Chinese (cmn), Welsh (cym), Danish (dan),  
     German (deu), Estonian (est), Finnish (fin), French (fra), Hindi (hin), Indonesian (ind), Italian (ita), Japanese (jpn),  
     Korean (kor), Maltese (mlt), Dutch (nld), Persian (pes), Polish (pol), Portuguese (por), Romanian (ron), Russian (rus),  
     Slovak (slk), Spanish (spa), Swedish (swe), Swahili (swh), Telugu (tel), Tagalog (tgl), Thai (tha), Turkish (tur),  
     Ukrainian (ukr), Urdu (urd), Uzbek (uzn), Vietnamese (vie)  

Use the --inputLanguage <inputLanguage> and --outputLanguage <outputLanguage> options to configure the languages.  
inputLanguage correspond to what you hear in your headphones and outputLanguage to what your interlocutor will hear. 

By default, the public subnet will be used with the erc20 network driver, the polygon payment driver and a GPU provider whitelist.  
The image has already been uploaded to these providers (whitelisted).  
Their prices are 1 GLM/h for the RTX3090 and 2 GLM/h for the RTX4060.  
This application requires a GPU provider with at least 12 GB of VRAM and 10 GB of RAM.  

If you want to use a specific (compatible) GPU provider, use the '--providerId providerid' option.  
If you want to use a GPU provider among all those available (the cheapest), use the '--useOnlyWhitelisted false' option.  

You can also set your prices and budget with the maxStartPrice, maxCpuPricePerHour, maxEnvPricePerHour and budget options.  

The list of compatible GPU providers is saved in the gpu_providers.txt file in order to guide your choices.  

<p align="center">
<img src="screenshots/gpu_providers_list.png" width="100%"> 
</p>

The application takes about a minute to launch.  

<p align="center">
<img src="screenshots/SST_launch.png" width="100%"> 
</p>

You can run this application in debug mode, you will be able to access the provider in ssh and the configuration web pages.  
In debug mode, you can modify the translation parameters directly (language, sts/sts&t mode, etc.).  

<p align="center">
<img src="screenshots/debug_ssh_provider.png" width="100%"> 
</p>

<p align="center">
<img src="screenshots/debug_web_pages_config.png" width="75%"> 
</p>

**Build GVMI image**  

- Download seamless_streaming_unity.pt from https://huggingface.co/facebook/seamless-streaming/blob/main/seamless_streaming_unity.pt and place it in Docker_Golem_SST/libs/huggingface/fairseq2/assets/67ee4586019ee2f8128d8c2c/  

- Download seamless_streaming_monotonic_decoder.pt from https://huggingface.co/facebook/seamless-streaming/blob/main/seamless_streaming_monotonic_decoder.pt and place it in Docker_Golem_SST/libs/huggingface/fairseq2/assets/ab809bf1032fc01a6bb9b3e3/  

- Download vocoder_v2.pt from https://huggingface.co/facebook/seamless-streaming/blob/main/vocoder_v2.pt and place it in Docker_Golem_SST/libs/huggingface/fairseq2/assets/72156bff62197705b8e88f19/  

- Download m2m_expressive_unity.pt, pretssel_melhifigan_wm.pt, pretssel_melhifigan_wm-16khz.pt from https://huggingface.co/facebook/seamless-expressive and place them in Docker_Golem_SST/models/  

```
cd Docker_Golem_SST
docker build -t golem_sst .
gvmkit-build --push golem_sst:latest
```

Compute hash with krunch3r76's tool (https://github.com/krunch3r76/gc__gvmi_hash):  

```
gc__gvmi_hash.py docker-golem_sst-latest-xxxxxxxxxx.gvmi
```

Push generated file in your own http server file (because image is too large for Golem registry, about 18GB).  
Replace shasum and url in manifest.json.  
