// Modules
const fetch = require("node-fetch");
const si = require("systeminformation");
const ShardingUtil = require("./util/shardUtil");
const { EventEmitter } = require("events");
const util = require("util");
const fs = require("fs");

class ShardingClient extends EventEmitter {
    static post = ShardingUtil.post;
    static postCommand = ShardingUtil.postCommand;

    constructor(options) {
        super();

        if (!options.debug) options.debug = {
            enabled: false,
            outfile: null
        }

        this.debug = options.debug.enabled || false;
        this.debug_outfile = options.debug.outfile || null;

        const { key, manager } = options;
        let { postCpuStatistics, postMemStatistics, postNetworkStatistics, autopost } = options;

        // Check for discord.js
        try {
            this.discord = require("discord.js");
        } catch (e) {
            throw new Error("statcord.js needs discord.js to function");
        }

        // Key error handling
        if (!key) throw new Error('"key" is missing or undefined');
        if (typeof key !== "string") throw new TypeError('"key" is not typeof string');
        if (!key.startsWith("statcord.com-")) throw new Error('"key" is not prefixed by "statcord.com-", please follow the key format');
        // Manager error handling
        if (!manager) throw new Error('"manager" is missing or undefined');
        if (!(manager instanceof this.discord.ShardingManager)) throw new TypeError('"manager" is not a discord.js sharding manager');
        // Auto post arg checking
        if (!autopost == null || autopost == undefined) autopost = true;
        if (typeof autopost !== "boolean") throw new TypeError('"autopost" is not of type boolean');
        // Post arg error checking
        if (postCpuStatistics == null || postCpuStatistics == undefined) postCpuStatistics = true;
        if (typeof postCpuStatistics !== "boolean") throw new TypeError('"postCpuStatistics" is not of type boolean');
        if (postMemStatistics == null || postMemStatistics == undefined) postMemStatistics = true;
        if (typeof postMemStatistics !== "boolean") throw new TypeError('"postMemStatistics" is not of type boolean');
        if (postNetworkStatistics == null || postNetworkStatistics == undefined) postNetworkStatistics = true;
        if (typeof postNetworkStatistics !== "boolean") throw new TypeError('"postNetworkStatistics" is not of type boolean');

        // Local config
        this.autoposting = autopost;

        // API config
        this.baseApiUrl = "https://statcord.com/logan/stats";
        this.key = key;
        this.manager = manager;

        // General config
        this.activeUsers = [];
        this.commandsRun = 0;
        this.popularCommands = [];
        this.used_bytes = 0;

        // Opt ins
        this.postCpuStatistics = postCpuStatistics;
        this.postMemStatistics = postMemStatistics;
        this.postNetworkStatistics = postNetworkStatistics;

        // Create custom fields map
        this.customFields = new Map();

        // Check if all shards have been spawned
        this.manager.on("shardCreate", (shard) => {
            // Get current shard
            let currShard = this.manager.shards.get(shard.id);

            // If this is the last shard, wait until it is ready
            if (shard.id + 1 == this.manager.totalShards && autopost) {
                // When ready start auto post
                this.debugLog("Listening for final shard \"ready\" event");
                currShard.once("ready", () => {
                    setTimeout(async () => {
                        this.debugLog("Starting autopost");
                        this.emit("autopost-start");

                        this.debugLog("Initial post");
                        this.post();

                        this.debugLog("Starting interval");

                        setInterval(() => {
                            this.post();
                        }, 60000);
                    }, 200);
                });
            }

            // Start message listener
            currShard.on("message", async (message) => {
                // If there is no message or it isn't a string (ignore broadcastEvals)
                if (!message || typeof message !== "string") return;

                // Check if they are statcord messages
                if (!message.startsWith("ssc")) return;
                let args = message.split("|=-ssc-=|"); // get the args

                if (args[0] == "sscpc") { // PostCommand message
                    this.debugLog("Received command post from shard");
                    this.postCommand(args[1], args[2]);
                } else if (args[0] == "sscp") { // Post message
                    this.debugLog("Received full post request from shard");
                    this.post();
                }
            });
        });
    }

    // Post stats to API
    async post() {
        this.debugLog("Starting post", "post");

        let bandwidth = 0;

        if (this.postNetworkStatistics) {
            // Set initial used network bytes count
            if (this.used_bytes <= 0) this.used_bytes = (await si.networkStats()).reduce((prev, current) => prev + current.rx_bytes, 0);

            // Calculate used bandwidth
            let used_bytes_latest = (await si.networkStats()).reduce((prev, current) => prev + current.rx_bytes, 0);
            bandwidth = used_bytes_latest - this.used_bytes;
            this.used_bytes = used_bytes_latest;
        }

        // counts
        let guild_count = await getGuildCountV12(this.manager);
        let user_count = await getUserCountV12(this.manager);

        // Get and sort popular commands
        let popular = [];

        let sortedPopular = this.popularCommands.sort((a, b) => a.count - b.count).reverse();

        for (let i = 0; i < sortedPopular.length; i++) {
            popular.push({
                name: sortedPopular[i].name,
                count: `${sortedPopular[i].count}`
            });
        }

        // Limit popular to the 5 most popular
        if (popular.length > 5) popular.length = 5;

        // Get system information
        let memactive = 0;
        let memload = 0;
        let cpuload = 0;

        // Get mem stats
        if (this.postMemStatistics) {
            const mem = await si.mem();

            // Get active memory in MB
            memactive = mem.active;
            // Get active mem load in %
            memload = Math.round(mem.active / mem.total * 100);
        }

        // Get cpu stats
        if (this.postCpuStatistics) {
            const platform = require("os").platform();

            // Current load is not avaliable on bsd
            if (platform !== "freebsd" && platform !== "netbsd" && platform !== "openbsd") {
                const load = await si.currentLoad();

                // Get current load
                cpuload = Math.round(load.currentload);
            }
        }

        // Get client id
        let id = (await this.manager.broadcastEval("this.user.id"))[0];

        // Post data
        let requestBody = {
            id, // Client id
            key: this.key, // API key
            servers: guild_count.toString(), // Server count
            users: user_count.toString(), // User count
            active: this.activeUsers, // Users that have run commands since the last post
            commands: this.commandsRun.toString(), // The how many commands have been run total
            popular, // the top 5 commands run and how many times they have been run
            memactive: memactive.toString(), // Actively used memory
            memload: memload.toString(), // Active memory load in %
            cpuload: cpuload.toString(), // CPU load in %
            bandwidth: bandwidth.toString(), // Used bandwidth in bytes
            custom1: "0", // Custom field 1
            custom2: "0" // Custom field 2
        }

        // Get custom field one value
        if (this.customFields.get(1)) {
            this.debugLog("Start getting custom field 1", "post");
            requestBody.custom1 = await this.customFields.get(1)(this.manager);
            this.debugLog(requestBody.custom1, "post");
            this.debugLog("End getting custom field 1", "post");
        }

        // Get custom field two value
        if (this.customFields.get(2)) {
            this.debugLog("Start getting custom field 2", "post");
            requestBody.custom2 = await this.customFields.get(2)(this.manager);
            this.debugLog(requestBody.custom2, "post");
            this.debugLog("End getting custom field 2", "post");
        }

        {
            this.debugLog(
              `Post Data\n${util.inspect(requestBody, false, null, false)}`,
              "post"
            );
        }

        // Reset stats
        this.activeUsers = [];
        this.commandsRun = 0;
        this.popularCommands = [];

        // Create post request
        let response;
        try {
            response = await fetch(this.baseApiUrl, {
                method: "post",
                body: JSON.stringify(requestBody),
                headers: {
                    "Content-Type": "application/json"
                }
            });
        } catch (e) {
            this.emit("post", "Unable to connect to the Statcord server. Going to automatically try again in 60 seconds, if this problem persists, please visit status.statcord.com");

            if (!this.autoposting) {
                setTimeout(() => {
                    this.post();
                }, 60000);
            }

            return;
        }

        this.debugLog(
            `Fetch response\n${util.inspect(response, false, null, false)}`,
            "post"
        );

        // Statcord server side errors
        if (response.status >= 500) {
            this.debugLog("HTTP 500 error received", "post");
            this.emit("post", new Error(`Statcord server error, statuscode: ${response.status}`));
            return;
        }

        // Get body as JSON
        let responseData;
        try {
            responseData = await response.json();
        } catch {
            this.debugLog("Invalid response data received", "post");
            this.emit("post", new Error(`Statcord server error, invalid json response`));
            return;
        }

        this.debugLog(
            `Response data\n${util.inspect(responseData, false, null, false)}`,
            "post"
        );

        // Check response for errors
        if (response.status == 200) {
            this.debugLog("HTTP code 200", "post");
            // Success
            this.emit("post", false);
        } else if (response.status == 400 || response.status == 429) {
            this.debugLog(`HTTP code ${response.status}`, "post");
            this.debugLog(responseData.error, "post");
            this.debugLog(responseData.message, "post");
            // Bad request or rate limit hit
            this.emit("post", new Error(responseData.message));
        } else {
            this.debugLog(`UNKNOWN HTTP ERROR: ${response.status}`, "post");
            // Other
            this.emit("post", new Error("An unknown error has occurred"));
        }

        this.debugLog("Post end", "post");
    }

    // Post stats about a command
    async postCommand(command_name, author_id) {
        // Command name error checking
        if (!command_name) throw new Error('"command_name" is missing or undefined');
        if (typeof command_name !== "string") throw new TypeError('"command_name" is not typeof string');
        // Author id error checking
        if (!author_id) throw new Error('"author_id" is missing or undefined');
        if (typeof author_id !== "string") throw new TypeError('"author_id" is not typeof string');

        // Add the user to the active users list if they aren't already there
        if (!this.activeUsers.includes(author_id)) this.activeUsers.push(author_id);

        // Check if the popular commands has this command
        if (!this.popularCommands.some(command => command.name == command_name)) {
            // If it doesn't exist add to the array
            this.popularCommands.push({
                name: command_name,
                count: 1
            });
        } else {
            // If it does exist increment the count of the command
            let commandIndex = this.popularCommands.findIndex(command => command.name == command_name);
            // Increment the command count
            this.popularCommands[commandIndex].count++;
        }

        // Increment the commandsRun variable
        this.commandsRun++;
    }

    // Register the function to get the values for posting
    async registerCustomFieldHandler(customFieldNumber, handler) {
        // Check if the handler already exists
        if (this.customFields.get(customFieldNumber)) throw new Error("Handler already exists");

        // Testing
        if (typeof handler !== "function") throw new Error("Handler is not a function");
        if (typeof (await handler(this.manager)) !== "string") throw new Error("Handler doesn't return strings");

        // If it doen't set it
        this.customFields.set(customFieldNumber, handler);
    }

    debugLog(info, type = "") {
        if (!this.debug) return;

        let out = `[Statcord${type.length > 1 ? ` - ${type}` : ""}] ${info}`;

        if (this.debug_outfile) {
            fs.appendFile(require("path").join(process.cwd(), this.debug_outfile), out + "\n", (err) => {
                if (err) console.error(err);
            });
        } else {
            console.info(out);
        }
    }
}

// V12 sharding gets 
async function getGuildCountV12(manager) {
    return (await manager.fetchClientValues("guilds.cache.size")).reduce((prev, current) => prev + current, 0);
}

async function getUserCountV12(manager) {
    const memberNum = await manager.broadcastEval('this.guilds.cache.reduce((prev, guild) => prev + guild.memberCount, 0)');
    return memberNum.reduce((prev, memberCount) => prev + memberCount, 0);
}
// end

module.exports = ShardingClient;
