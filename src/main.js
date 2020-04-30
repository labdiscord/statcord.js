const fetch = require("node-fetch");
class Statcord {
  constructor(KEY, CLIENT) {
    if (!KEY || typeof KEY != "string")
      console.error(
        "You have provided an item that is not a string. Please replace the item (statcord-api)"
      );

    if (!CLIENT)
      console.error(
        "You have provided an item that is not a object. Please replace the item (statcord-api)"
      );
    this.baseURL = "https://beta.statcord.com/mason/stats";
    this.key = KEY;
    this.client = CLIENT;
    this.active = [];
    this.commands = 0;
    this.popular = [];
  }

  async post() {
    if (require('discord.js').version >= '12.0.0') {
      this.ver12 = true
    } else {
      this.ver12 = false
    }
        if (this.client.shard) {
      if(this.ver12 === true){
      if(this.client.shard.ids[0] !== 0) this.shard_id = true
      } else {
        if(this.client.shard.id !== 0) this.shard_id = true
      }
      this.sharding = true;
    } else {
      this.sharding = false;
      this.shard_id = false
    }
    if(this.shard_id === true) return;
    let guildSize = 0;
    if (this.ver12 === true) {
      if (this.sharding == true) {
        await this.client.shard
          .fetchClientValues("guilds.cache.size")
          .then(results => {
            guildSize = results.reduce(
              (prev, guildCount) => prev + guildCount,
              0
            );
          });
      } else {
        guildSize = this.client.guilds.cache.size;
      }
    } else {
      if (this.sharding == true) {
        await this.client.shard
          .fetchClientValues("guilds.size")
          .then(results => {
            guildSize = results.reduce(
              (prev, guildCount) => prev + guildCount,
              0
            );
          });
      } else {
        guildSize = this.client.guilds.size;
      }
    }
    let userSize = 0;
    if (this.ver12 === true) {
      if (this.sharding == true) {
await this.client.shard.broadcastEval(`
let array = []
for(const data of this.guilds.cache.array()){
for(const member of data.members.cache.array()){
if(array.includes(member.id)) continue;
array.push(member.id)
}
}
array.length
`).then(re => {
for(const data of re){
  userSize = userSize + data
}
}).catch(err => console.log(err))
      } else {
let array = []
for(const data of this.client.guilds.cache.array()){
  for(const member of data.members.cache.array()){
if(array.includes(member.id)) continue;
await array.push(member.id)
}
}
        userSize = array.length
      }
    } else {
      if (this.sharding == true) {
await this.client.shard.broadcastEval(`
let array = []
for(const data of this.guilds.array()){
for(const member of data.members.array()){
if(array.includes(member.id)) continue;
array.push(member.id)
}
}
array.length
`).then(re => {
for(const data of re){
  userSize = userSize + data
}
}).catch(err => console.log(err))
      } else {
let array = []
for(const data of this.client.guilds.array()){
  for(const member of data.members.array()){
if(array.includes(member.id)) continue;
await array.push(member.id)
}
}
        userSize = array.length
      }
    }
    let popular = [];
    let array = this.popular.sort(function(a, b) {
      return b.count - a.count;
    });
    for (const data of array) {
      if (array[0] === data || array[1] === data || array[2] === data) {
        popular.push({
          name: data.name,
          count: data.count.toString()
        });
      } else continue;
    }
    let body = {
      id: this.client.user.id,
      key: this.key,
      servers: guildSize.toString(),
      users: userSize.toString(),
      active: this.active.length.toString(),
      commands: this.commands.toString(),
      popular: popular
    };
    let response;
    await fetch(this.baseURL, {
      method: "post",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" }
    })
      .then(res => {
        response = {
          message: res.statusText,
          statusCode: res.status
        };
      })
      .catch(err => {
        console.log(err);
      });
    this.active = [];
    this.commands = 0;
    this.popular = [];

    if (response.statusCode === 200) {
      //console.log(response);
    } else {
      console.log(response);
    }
  }

  async autoPost() {
    console.log("Statcord Auto Post Started");
    await this.post();

    setInterval(
      async function(arg1) {
        await arg1.post();
      },
      3600000,
      this
    );
  }
  async postCommand(command, author_id) {
    if (require('discord.js').version >= '12.0.0') {
      this.ver12 = true
    } else {
      this.ver12 = false
    }
        if (this.client.shard) {
      if(this.ver12 === true){
      if(this.client.shard.ids[0] !== 0) this.shard_id = true
      } else {
        if(this.client.shard.id !== 0) this.shard_id = true
      }
      this.sharding = true;
    } else {
      this.sharding = false;
      this.shard_id = false
    }
    if(this.sharding === false){
    if (!command || typeof command != "string")
      return console.error("You didn't provide enough parameters");

    if (!author_id || typeof author_id != "string")
      return console.error(
        "You didn't provide enough parameters! Make sure the author id is a string!"
      );
console.log({command: command, author_id: author_id})
    this.commands = this.commands + 1;
    if (!this.active.includes(author_id)) this.active.push(author_id);
    let obj = {
      name: command,
      count: 1
    };
    if (!this.popular.some(m => m.name === command)) {
      this.popular.push(obj);
    } else {
      let fi = this.popular.find(m => m.name === command);
      let objIndex = this.popular.findIndex(obj => obj.name == command);
      this.popular[objIndex].count = fi.count + 1;
    }
    } else {
      if(this.shard_id === false){
            if (!command || typeof command != "string")
      return console.error("You didn't provide enough parameters");

    if (!author_id || typeof author_id != "string")
      return console.error(
        "You didn't provide enough parameters! Make sure the author id is a string!"
      );
console.log({command: command, author_id: author_id})
    this.commands = this.commands + 1;
    if (!this.active.includes(author_id)) this.active.push(author_id);
    let obj = {
      name: command,
      count: 1
    };
    if (!this.popular.some(m => m.name === command)) {
      this.popular.push(obj);
    } else {
      let fi = this.popular.find(m => m.name === command);
      let objIndex = this.popular.findIndex(obj => obj.name == command);
      this.popular[objIndex].count = fi.count + 1;
    }
      } else {
      this.client.shard.broadcastEval(`
let m = ${this.shard_id}
if(m === true){
const statcord = require('statcord.js-beta')
let client = new statcord(\`${this.key}\`, \`${this.client}\`)
client.postCommand(\`${command}\`, \`${author_id}\`)
}
`)
      }
    }
  }
}

module.exports = Statcord;
