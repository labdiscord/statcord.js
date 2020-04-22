const fetch = require('node-fetch');
class StatCord {
    constructor(KEY, CLIENT) {
        if (!KEY || typeof KEY != 'string') 
            throw new Error("You have provided an item that is not a string. Please replace the item (statcord-api)")
        
        if (!CLIENT) 
            throw new Error("You have provided an item that is not a object. Please replace the item (statcord-api)")
        
        this.baseURL = "https://statcord.com/apollo/post/stats"
        this.key = KEY;
        this.client = CLIENT;
    }

    async post() {
        setInterval(async function () {
            let ver12;
            if (this.client.guilds.cache) {
                ver12 = true
            } else {
                ver12 = false
            }
            let sharding;
            if (this.client.shard) {
                sharding = true
            } else {
                sharding = false
            }
            let guildSize = 0;
            if (ver12) {
                if (sharding == true) {
                    await this.client.shard.fetchClientValues('guilds.cache.size').then(results => {
                        guildSize = results.reduce((prev, guildCount) => prev + guildCount, 0)
                    })
                } else {
                    guildSize = this.client.guilds.cache.size
                }
            } else {
                if (sharding == true) {
                    await this.client.shard.fetchClientValues('guilds.size').then(results => {
                        guildSize = results.reduce((prev, guildCount) => prev + guildCount, 0)
                    })
                } else {
                    guildSize = this.client.guilds.size
                }
            }
            let userSize = 0;
            if (ver12) {
                if (sharding == true) {
                    await this.client.shard.broadcastEval('this.guilds.cache.reduce((prev, guild) => prev + guild.memberCount, 0)').then(results => {
                        userSize = results.reduce((prev, memberCount) => prev + memberCount, 0)
                    }).catch(console.error);
                } else {
                    userSize = this.client.guilds.cache.map(g => g.memberCount).reduce(function (accumulator, currentValue) {
                        return accumulator + currentValue;
                    }, 0);
                }
            } else {
                if (sharding == true) {
                    await this.client.shard.broadcastEval('this.guilds.reduce((prev, guild) => prev + guild.memberCount, 0)').then(results => {
                        userSize = results.reduce((prev, memberCount) => prev + memberCount, 0)
                    }).catch(console.error);
                } else {
                    userSize = this.client.guilds.map(g => g.memberCount).reduce(function (accumulator, currentValue) {
                        return accumulator + currentValue;
                    }, 0);
                }
            }
            let body = {
                "id": this.client.user.id,
                "key": this.key,
                "servers": guildSize,
                "users": userSize
            }
            let response;
            await fetch(this.baseURL, {
                method: 'post',
                body: JSON.stringify(body),
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(res => res.json()).then(json => {
                response = {
                    message: json.message,
                    statusCode: json.statusCode
                }
            }).catch(err => {
                response = {
                    message: err.message,
                    statusCode: err.statusCode
                }
            })
            if (response.statusCode === 200) {
                return response
            } else {
                function Failed(message, code) {
                    this.message = message;
                    this.statusCode = code;
                }
                throw new Failed(response.message, response.statusCode)
            }
        }, 60000 * 45)
    }
}
