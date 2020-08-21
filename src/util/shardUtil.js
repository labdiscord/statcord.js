// Post stats about a command
module.exports.postCommand = (command_name, author_id, client) => {
    // Get discord for type checking
    const Discord = require("discord.js");

    // Command name error checking
    if (!command_name) throw new Error('"command_name" is missing or undefined');
    if (typeof command_name !== "string") throw new TypeError('"command_name" is not typeof string');
    // Author id error checking
    if (!author_id) throw new Error('"author_id" is missing or undefined');
    if (typeof author_id !== "string") throw new TypeError('"author_id" is not typeof string');
    // Client error checking
    if (!client) throw new Error('"client" is missing or undefined');
    if (!(client instanceof Discord.Client)) throw new Error('"client" is not a discord.js client');
    if (!client.shard) throw new Error("This function is only for sharded clients");
    
    // Send message with args to Statcord Sharding Client
    client.shard.send(`sscpc|=-ssc-=|${command_name}|=-ssc-=|${author_id}`);
}

// Post all current stats to statcord
module.exports.post = (client) => {
    // Get discord for type checking
    const Discord = require("discord.js");
    // Client error checking
    if (!client) throw new Error('"client" is missing or undefined');
    if (!(client instanceof Discord.Client)) throw new Error('"client" is not a discord.js client');
    if (!client.shard) throw new Error("This function is only for sharded clients");
    
    // Send message with args to Statcord Sharding Client
    client.shard.send(`sscp|=-ssc-=|`);
}