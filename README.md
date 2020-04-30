<h1 align="center" id="statcordjs">
    statcord.js
</h1>

<h3 align="center">A simple API wrapper for statcord.com to connect your bot and get your bot stats.</h3>



----

<!-- Content -->
## Installation

Install via npm (recommended)

```shell
npm i statcord.js
```

## Features

* AUTOMATIC server & user count updating.


## Example Discord.js Setup

### Posting user & servers count, popular commands and active users
```js
let Discord = require('discord.js')
let client = new Discord.Client()
let statcord = require('statcord.js')
let statclient = new statcord("statcord.com-AddYourKeyHere", client)
const prefix = 'YourPrefix'

client.on('ready', async() => {
await statclient.autoPost()
})

client.on('message', message => {
  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  if(command === 'ping'){
    statclient.postCommand(command, message.author.id)
    message.channel.send('Pong!')
  }
})

client.login("YourDiscordBotTokenHere")
```

## Caution for Sharding Bots

If you are using sharding in your bot, make sure you use the constructor (`let statclient = new statcord("statcord.com-AddYourKeyHere", client)`) for statClient only after all shards are spawned. If not, you will be resulted an error.


## Contributing

Contributions are always welcome!\
Take a look at any existing issues on this repository for starting places to help contribute towards, or simply create your own new contribution to the project.

When you are ready, simply create a pull request for your contribution and we will review it whenever we can!

### Donating

You can also help me and the project out by sponsoring me through a [donation on PayPal](http://paypal.me/deltafloof).


## Discussion, Support and Issues

Need support with this project, have found an issue or want to chat with others about contributing to the project?
> Please check the project's issues page first for support & bugs!

Not found what you need here?

* If you have an issue, please create a GitHub issue here to report it, include as much detail as you can.
* _Alternatively,_ You can join our Discord server to discuss any issue or to get support for the project.:

<a href="http://statcord.com/discord" target="_blank">
    <img src="https://discordapp.com/api/guilds/608711879858192479/embed.png" alt="Discord" height="30">
</a>
