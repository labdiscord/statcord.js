const Discord = require("discord.js");
const Statcord = require("../src");

const manager = new Discord.ShardingManager('./sClient.js', { token: "Njk3MDc4MjEyMjIzNTY1ODk3.XvmU-A._6xHVgUBbGETr5-kr4Cs4KMdXPg"});
// Create statcord sharding client
const statcord = new Statcord.ShardingClient({
    key: "statcord.com-VJMLOSRLJICsJnGDsFoT",
    manager
});

statcord.registerCustomFieldHandler(1, async (manager) => {
    const memberNum = await manager.broadcastEval('this.guilds.cache.reduce((prev, guild) => prev + guild.memberCount, 0)');
    return memberNum.reduce((prev, memberCount) => prev + memberCount, 0).toString();
});

statcord.registerCustomFieldHandler(2, async (manager) => {
    return (await manager.fetchClientValues("guilds.cache.size")).reduce((prev, current) => prev + current, 0).toString();
});

// Spawn shards, statcord works with both auto and a set amount of shards
manager.spawn(2);

// Normal shardCreate event
manager.on("shardCreate", (shard) => {
    console.log(`Spawned shard ${shard.id} of ${manager.totalShards - 1}`);
});