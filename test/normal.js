const Statcord = require("../src");
const Discord = require("discord.js");
const si = require("systeminformation");
 
const client = new Discord.Client();
// Create statcord client
const statcord = new Statcord.Client({
    key: "statcord.com-VJMLOSRLJICsJnGDsFoT",
    client: client
});

statcord.registerCustomFieldHandler(1, (client) => {
    return new Promise((resolve) => {
        const users = client.users.cache.size;

        resolve(users.toString());
    });
});

statcord.registerCustomFieldHandler(2, (client) => {
    return new Promise((resolve) => {
        const guilds = client.guilds.cache.size;

        resolve(guilds.toString());
    });
});
 
// Client prefix
const prefix = "cs!";
 
client.on("ready", async () => {
    console.log("ready");
 
    // setTimeout(async () => {
    //     // Start auto posting
    //     let initalPost = await statcord.autopost();
    
    //     // If there is an error, console.error and exit
    //     if (initalPost) {
    //         console.error(initalPost);
    //         process.exit();
    //     }
    // }, 10000)
});
 
 
client.on("message", async (message) => {
    if (message.author.bot) return;
    if (message.channel.type !== "text") return;
 
    if (!message.content.startsWith(prefix)) return;
 
    let command = message.content.split(" ")[0].toLowerCase().substr(prefix.length);
 
    // Post command
    statcord.postCommand(command, message.author.id);
 
    if (command == "say") {
        message.channel.send("say");
    } else if (command == "help") {
        message.channel.send("help");
    } else if (command == "post") {
        // // Only owner runs this command
        // if (message.author.id !== "350707981178109964") return;
 
        // Example of manual posting
        let postError = await statcord.post();
 
        // If there is a post error notify command runner
        if (postError) {
            message.channel.send(postError.message);
        } else {
            message.channel.send("Success");
        }
    } else if (command == "stats") {
        const mem = await si.mem();

        let memactive = Math.round(mem.active / 1000000);
        let memload = Math.round(mem.active / mem.total * 100);

        const load = await si.currentLoad();

        let cpuload = Math.round(load.currentload);

        const temp = await si.cpuTemperature();

        let cputemp = temp.main;

        message.channel.send(`
Active memory: ${memactive}MB
Mem Load: ${memload}%
CPU Load: ${cpuload}%
CPU Temp: ${cputemp}
        `);
    } else if (command == "test") {
        console.log((await si.mem()).active / 1000000000)
        console.log(process.memoryUsage().heapUsed / 1000000000)
    }
})
 
client.login("Njk3MDc4MjEyMjIzNTY1ODk3.XvmU-A._6xHVgUBbGETr5-kr4Cs4KMdXPg");