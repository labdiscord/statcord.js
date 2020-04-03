# statcord.js

---

# Init
## THIS MUST GO INSIDE YOUR READY EVENT

```js
var statcord = require("statcord.js");

/**
set shardingStatus to `true` if sharding, else, set as `false`
set v12 to `true` if discord.js == 12.x, else, `false`
**/

var statClient = new statcord("KEY", DiscordClient, shardingStatus, v12);

var req = statClient.post();

//returns a normal <HTTPRequest>, call <Request>.body in code and do whatever.
```

---

# Questions

Wanna ask something about the API?

Contact us on [Discord](https://statcord.com/discord)

<a href="http://statcord.com/discord" target="_blank">
    <img src="https://discordapp.com/api/guilds/608711879858192479/embed.png" alt="Discord" height="30">
</a>
