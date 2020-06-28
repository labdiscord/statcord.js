// Modules
const fetch = require("node-fetch");

/**
 * @class Statcord
 */
class Statcord {
    /**
     * Non sharding client
     * @param {string} key - your statcord key prefix by "statcord.com-""
     * @param {*} client - your discord.js client object
     */
    constructor(key, client) {
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
        // Client error handling
        if (!client) throw new Error('"client" is missing or undefined');
        if (!(client instanceof this.discord.Client)) throw new TypeError('"client" is not a discord.js client');

        // API config
        this.baseApiUrl = "https://statcord.com/mason/stats";
        this.key = key;
        this.client = client;

        // General config
        this.v11 = this.discord.version <= "12.0.0";
        this.v12 = this.discord.version >= "12.0.0";
        this.activeUsers = [];
        this.commandsRun = 0;
        this.popularCommands = [];

        // Check for sharding
        if (this.client.shard) {
            this.sharding = true;

            throw new Error("Please use the statcord sharding client if you wish to use shards");
        } else this.sharding = false;
    }

    /**
     * Manual posting
     * @returns {Promise<boolean | Error>} returns false if there was no error, returns an error if there was.
     */
    async post() {
        // Non-Sharding client
        if (this.sharding) return new Error("Please use the statcord sharding client if you wish to use shards");

        // counts
        let guild_count = 0;
        let user_count = 0;

        // V12 code
        if (this.v12) {
            guild_count = this.client.guilds.cache.size;
            user_count = this.client.users.cache.size;
        } else if (this.v11) { // V11 code
            guild_count = this.client.guilds.size;
            user_count = this.client.users.size;
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

        // Post data
        let requestBody = {
            id: this.client.user.id, // Client id
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

        // Server error on statcord
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
     * Auto posting
     * @returns {Promise<boolean | Error>} returns false if there was no error, returns an error if there was. Only on the first run, otherwise the rest will be ignored
     */
    async autopost() {
        // Non-Sharding client
        if (this.sharding) throw new Error("Please use the statcord sharding client if you wish to use shards");

        console.log("Statcord Auto Post Started");
        let post = await this.post(); // Create first post
    
        // set interval to post every hour
        setInterval(
            async () => {
                await this.post(); // post once every hour
            },
            60000
        );

        // resolve with initial errors
        return Promise.resolve(post);
    }

    /**
     * Post stats about a command
     * @param {string} command_name - The name of the command that was run
     * @param {string} author_id - The id of the user that ran the command
     */
    async postCommand(command_name, author_id) {
        // Non-Sharding client
        if (this.sharding) throw new Error("Please use the statcord sharding client if you wish to use shards");

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
async function getGuildCountV12(client) {
    return (await client.shard.fetchClientValues("guilds.cache.size")).reduce((prev, current) => prev + current, 0);
}

async function getUserCountV12(client) {
    return (await client.shard.fetchClientValues("users.cache.size")).reduce((prev, current) => prev + current, 0);
}
// end

// v11 sharding gets
async function getGuildCountV11(client) {
    return (await client.shard.fetchClientValues("guilds.size")).reduce((prev, current) => prev + current, 0);
}

async function getUserCountV11(client) {
    return (await client.shard.fetchClientValues("users.size")).reduce((prev, current) => prev + current, 0);
}
//end


module.exports = Statcord;
