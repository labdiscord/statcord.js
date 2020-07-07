const Discord = require("discord.js");
const Statcord = require("../src");

const client = new Discord.Client();
/* There is no need to create a statcord client in the bot script,
because it has already been made in the sharding script
*/

// Client prefix
const prefix = "cs!";

client.on("ready", async () => {
    console.log("ready");
});

client.on("message", async (message) => {
    if (message.author.bot) return;
    if (message.channel.type !== "text") return;

    if (!message.content.startsWith(prefix)) return;

    let command = message.content.split(" ")[0].toLowerCase().substr(prefix.length);

    // Post command
    Statcord.ShardingClient.postCommand(command, message.author.id, client);

    if (command == "say") {
        message.channel.send("say");
    } else if (command == "help") {
        message.channel.send("help");
    } else if (command == "post") {
        // Only owner runs this command
        if (message.author.id !== "350707981178109964") return;

        // Example of manual posting
        Statcord.ShardingClient.post(client);

        // Errors on the sharding client will be sent to the console straight away
    }
});

client.login("Njk3MDc4MjEyMjIzNTY1ODk3.XvmU-A._6xHVgUBbGETr5-kr4Cs4KMdXPg");