// Modules
const fetch = require("node-fetch");
const si = require("systeminformation");
const { EventEmitter } = require("events");

class Statcord extends EventEmitter {
    constructor(options) {
        super();

        const { key, client } = options;
        let { postCpuStatistics, postMemStatistics, postNetworkStatistics } = options;
        
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
        // Post arg error checking
        if (postCpuStatistics == null || postCpuStatistics == undefined) postCpuStatistics = true;
        if (typeof postCpuStatistics !== "boolean") throw new TypeError('"postCpuStatistics" is not of type boolean');
        if (postMemStatistics == null || postMemStatistics == undefined) postMemStatistics = true;
        if (typeof postMemStatistics !== "boolean") throw new TypeError('"postMemStatistics" is not of type boolean');
        if (postNetworkStatistics == null || postNetworkStatistics == undefined) postNetworkStatistics = true;
        if (typeof postNetworkStatistics !== "boolean") throw new TypeError('"postNetworkStatistics" is not of type boolean');

        // Local config
        this.autoposting = false;

        // Local config
        this.autoposting = false;

        // API config
        this.baseApiUrl = "https://statcord.com/logan/stats";
        this.key = key;
        this.client = client;

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
        let guild_count = this.client.guilds.cache.size;
        let user_count = this.client.guilds.cache.reduce((prev, curr) => prev + curr.memberCount, 0);

        // Get and sort popular commands
        let popular = [];

        let sortedPopular = this.popularCommands.sort((a, b) => a.count - b.count).reverse();

        for (let i = 0; i < sortedPopular.length; i++) {
            popular.push({
                name: sortedPopular[i].name,
                count: `${sortedPopular[i].count}`
            });
        }

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

        // Post data
        let requestBody = {
            id: this.client.user.id, // Client id
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
            requestBody.custom1 = await this.customFields.get(1)(this.client);
        }

        // Get custom field two value
        if (this.customFields.get(2)) {
            requestBody.custom2 = await this.customFields.get(2)(this.client);
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

        // Server error on statcord
        if (response.status >= 500) {
            this.emit("post", new Error(`Statcord server error, statuscode: ${response.status}`));
            return;
        }

        // Get body as JSON
        let responseData;
        try {
            responseData = await response.json();
        } catch {
            this.emit("post", new Error(`Statcord server error, invalid json response`));
            return;
        }

        // Check response for errors
        if (response.status == 200) {
            // Success
            this.emit("post", false);
        } else if (response.status == 400 || response.status == 429) {
            // Bad request or Rate limit hit
            if (responseData.error) this.emit("post", new Error(responseData.message));
        } else {
            // Other
            this.emit("post", new Error("An unknown error has occurred"));
        }
    }

    // Auto posting
    async autopost() {
        // Non-Sharding client
        if (this.sharding) throw new Error("Please use the statcord sharding client if you wish to use shards");

        let post = await this.post(); // Create first post
    
        // set interval to post every hour
        setInterval(
            async () => {
                await this.post(); // post once every hour
            },
            60000
        );

        // set autoposting var
        this.autoposting = true;

        this.emit("autopost-start");

        // resolve with initial errors
        return Promise.resolve(post);
    }

    // Post stats about a command
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

    // Register the function to get the values for posting
    async registerCustomFieldHandler(customFieldNumber, handler) {
        // Check if the handler already exists
        if (this.customFields.get(customFieldNumber)) throw new Error("Handler already exists");

        // Testing
        if (typeof handler !== "function") throw new Error("Handler is not a function");
        if (typeof (await handler(this.client)) !== "string") throw new Error("Handler doesn't return strings");

        // If it doen't set it
        this.customFields.set(customFieldNumber, handler);
    }
}

module.exports = Statcord;
