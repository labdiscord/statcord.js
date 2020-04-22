const fetch = require('node-fetch');

class Statcord {
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
        console.log("Called")
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
        } 
        else {
            if (sharding == true) {
                await this.client.shard.fetchClientValues('guilds.size').then(results => {
                    guildSize = results.reduce((prev, guildCount) => prev + guildCount, 0)
                })
            } 
            else {
                guildSize = this.client.guilds.size
            }
        }
        let userSize = 0;
        if (ver12) {
            if (sharding == true) {
                await this.client.shard.broadcastEval('this.guilds.cache.reduce((prev, guild) => prev + guild.memberCount, 0)').then(results => {
                    userSize = results.reduce((prev, memberCount) => prev + memberCount, 0)
                }).catch(console.error);
            } 
            else {
                userSize = this.client.guilds.cache.map(g => g.memberCount).reduce(function (accumulator, currentValue) {
                    return accumulator + currentValue;
                }, 0);
            }
        } 
        else {
            if (sharding == true) {
                await this.client.shard.broadcastEval('this.guilds.reduce((prev, guild) => prev + guild.memberCount, 0)').then(results => {
                    userSize = results.reduce((prev, memberCount) => prev + memberCount, 0)
                }).catch(console.error);
            }else {
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
        /*var options = {
            method: 'POST',
            uri: this.baseURL,
            body: body,
            json: true // Automatically stringifies the body to JSON
        };
        console.log("hm")
        let response;
           await rp(options)
            .then(res => {response = res.body})
            .catch(err => {throw new Error(err)})*/
        
        try {
            const response = await fetch(this.baseURL, {
                method: 'post',
                body:    JSON.stringify(body),
                headers: { 'Content-Type': 'application/json' },
            })
            let json = await response.json();
            let status = await response.status();
            console.log(response)
            console.log(json)
            console.log(status)
            if (status!==200){
                throw new Error(response)
            }
          } catch (error) {
            console.log(error);
          }
        
        console.log("ho")
        console.log(status)
        console.log(json)
        console.log(response)
    }

    async autoPost(){
        console.log("Booting Up")
        await this.post()
        setInterval(async function() {
            console.log("POSTING")
            await this.post()
        }, 2700000)
    }
}

module.exports = Statcord;
