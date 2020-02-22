# statcord.js

---

# Init

```js
var statcord = require("statcord.js");

/**
set shardingStatus to `true` if sharding, else, set as `false`
**/

var statClient = new statcord("KEY", DiscordClient, shardingStatus);

var req = statClient.post();

//returns a normal <Object>, call <Request>.body in code.

console.log(req.body); //message:'success',statusCode:200
```

---

# Questions

Wanna ask something about the API?

Contact us on [Discord](https://statcord.com/discord)
