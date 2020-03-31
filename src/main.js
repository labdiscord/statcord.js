var request = require('snekfetch').post
class StatCord {
  constructor(KEY, CLIENT, sharding = false, v12) {
    if(!KEY || typeof KEY != 'string') throw new Error("You have provided an item that is not a string. Please replace the item (statcord-api)")
    if(!CLIENT) throw new Error("You have provided an item that is not a object. Please replace the item (statcord-api)")
    this.baseURL = "https://statcord.com/apollo/post/stats"
    this.key = KEY;
    this.client = CLIENT;
    this.sharding = sharding
    this.ver12 = v12
  }
  
  async post() { 
    var guildSize = 0;
    if(this.sharding == true) {
      var clientValues = await this.client.shard.fetchClientValues('guilds.size')
      guildSize = clientValues.reduce((prev, guildCount) => prev + guildCount, 0)
    } else {
      if(this.ver12) {
        guildSize = this.client.guilds.cache.size
      } else guildSize = this.client.guilds.size
    }
    var userSize = 0;
    if(this.sharding == true) {
      var clientValues = await this.client.shard.fetchClientValues('users.size')
      userSize = clientValues.reduce((prev, guildCount) => prev + guildCount, 0)
    } else {
      if(this.ver12) {
        userSize = this.client.guilds.cache.map(g => g.memberCount).reduce(function (accumulator, currentValue) {
        return accumulator + currentValue;
      }, 0);
      } else userSize = this.client.guilds.map(g => g.memberCount).reduce(function (accumulator, currentValue) {
        return accumulator + currentValue;
      }, 0);
    }
    
    return await request(this.baseURL, {
      headers: {
       "Content-Type": "application/json" 
      }
    })
    .send({
      "id": this.client.user.id,
      "key": this.key,
      "servers": guildSize,
      "users": userSize
    })

  }
}

module.exports = StatCord;
