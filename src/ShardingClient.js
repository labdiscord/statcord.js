// Modules
const fetch = require("node-fetch");

/**
 * @class ShardingClient
 */
class ShardingClient {
    /**
     * Sharding client
     * @param {string} key - your statcord key prefix by "statcord.com-""
     * @param {*} client - your discord.js shardingmanager object
     */
    constructor(key, manager) {
        // Check for discord.js
        try {
            this.discord = require("discord.js");
        } catch(e) {
            throw new Error("statcord.js needs discord.js to function");
        }

        // Key error handling
        if (!key) throw new Error('"key" is missing or undefined');
        if (typeof key !== "string") throw new TypeError('"key" is not typeof string');
        if (!key.startsWith("statcord.com-")) throw new Error('"key" is not prefixed by "statcord.com-", please follow the key format');
        // Manager error handling
        if (!manager) throw new Error('"manager" is missing or undefined');
        if (!(manager instanceof this.discord.ShardingManager)) throw new TypeError('"manager" is not a discord.js sharding manager');

        // API config
        this.baseApiUrl = "https://statcord.com/mason/stats";
        this.key = key;
        this.manager = manager;

        // General config
        this.v11 = this.discord.version <= "12.0.0";
        this.v12 = this.discord.version >= "12.0.0";
        this.activeUsers = [];
        this.commandsRun = 0;
        this.popularCommands = [];

        // Check if all shards have been spawned
        this.manager.on("shardCreate", (shard) => {
            // Get current shard
            let currShard = this.manager.shards.get(shard.id);

            // If this is the last shard, wait until it is ready
            if (shard.id + 1 == this.manager.totalShards) {
                // When ready start auto post
                currShard.once("ready", () => {
                    setTimeout(() => {
                        console.log("Starting autopost");

                        setInterval(async () => {
                            await this.post();
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
                    await this.postCommand(args[1], args[2]);
                } else if (args[0] == "sscp") { // Post message
                        let post = await this.post();
                        if (post) console.error(new Error(post));
                    }
            });
        });
    }

    /**
     * Manual posting
     * @private
     * @returns {Promise<boolean | Error>} returns false if there was no error, returns an error if there was.
     */
    async post() {
        // counts
        let guild_count = 0;
        let user_count = 0;

        // V12 code
        if (this.v12) {
            guild_count = await getGuildCountV12(this.manager);
            user_count = await getUserCountV12(this.manager);
        } else if (this.v11) { // V11 code
            guild_count = await getGuildCountV11(this.manager);
            user_count = await getUserCountV11(this.manager);
        }

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

        // Get client id
        let id = (await this.manager.broadcastEval("this.user.id"))[0];

        // Post data
        let requestBody = {
            id, // Client id
            key: this.key, // API key
            servers: guild_count.toString(), // Server count
            users: user_count.toString(), // User count
            active: this.activeUsers.length.toString(), // Users that have run commands since the last post
            commands: this.commandsRun.toString(), // The how many commands have been run total
            popular // the top 5 commands run and how many times they have been run
        }

        // Reset stats
        this.activeUsers = [];
        this.commandsRun = 0;
        this.popularCommands = [];

        // Create post request
        let response = await fetch(this.baseApiUrl, {
            method: "post",
            body: JSON.stringify(requestBody),
            headers: {
                "Content-Type": "application/json"
            }
        });

        // Statcord server side errors
        if (response.status >= 500) return new Error(`Statcord server error, statuscode: ${response.status}`);

        // Get body as JSON
        let responseData = await response.json();

        // Check response for errors
        if (response.status == 200) {
            // Success
            if (!responseData.error) return Promise.resolve(false);
        } else if (response.status == 400) {
            // Bad request
            if (responseData.error) return Promise.resolve(new Error(responseData.message));
        } else if (response.status == 429) {
            // Rate limit hit
            if (responseData.error) return Promise.resolve(new Error(responseData.message));
        } else {
            // Other
            return Promise.resolve(new Error("An unkown error has occurred"));
        }
    }

    /**
     * Post stats about a command
     * @private
     * @param {string} command_name - The name of the command that was run
     * @param {string} author_id - The id of the user that ran the command
     */
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

// v11 sharding gets
async function getGuildCountV11(manager) {
    return (await manager.fetchClientValues("guilds.size")).reduce((prev, current) => prev + current, 0);
}

async function getUserCountV11(manager) {
    return (await manager.fetchClientValues("users.size")).reduce((prev, current) => prev + current, 0);
}
//end

module.exports = ShardingClient;

const ShardingUtil = require("./util/shardUtil");

module.exports.postCommand = ShardingUtil.postCommand;
module.exports.post = ShardingUtil.post;
