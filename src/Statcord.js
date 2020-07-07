// Modules
const fetch = require("node-fetch");
const si = require("systeminformation");

/**
 * @class Statcord
 */
class Statcord {
    /**
     * @typedef {Object} ClientOptions
     * @property {string} key - your statcord key prefix by "statcord.com-""
     * @property {*} client - your discord.js client
     * @property {boolean} [postCpuStatistics=true] - Whether you want to post CPU usage
     * @property {boolean} [postMemStatistics=true] - Whether you want to post mem usage
     */

     /**
      * @typedef {import("discord.js").Client} Client
      */

    /**
     * Non sharding client
     * @param {ClientOptions} options
     */
    constructor(options) {
        const { key, client } = options;
        let { postCpuStatistics, postMemStatistics } = options;

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

        // API config
        this.baseApiUrl = "https://beta.statcord.com/logan/stats"; // TODO update for full release
        this.key = key;
        this.client = client;

        // General config
        this.v11 = this.discord.version <= "12.0.0";
        this.v12 = this.discord.version >= "12.0.0";
        this.activeUsers = [];
        this.commandsRun = 0;
        this.popularCommands = [];

        // Opt ins
        this.postCpuStatistics = postCpuStatistics;
        this.postMemStatistics = postMemStatistics;

        /**
         * Create custom fields map
         * @type {Map<1 | 2, (client: Client) => Promise<string>> }
         * @private
         */
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

        // Get system information
        let memactive = 0;
        let memload = 0;
        let cpuload = 0;
        let cputemp = 0;

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

            // Get cpu temperature
            const temp = await si.cpuTemperature();

            // The temperature is reported as "-1" if it cant get the actual temp. We need to report 0 if this is the case
            cputemp = temp.main !== -1 ? temp.main : 0;
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
            cputemp: cputemp.toString(), // CPU temp in deg celcius
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
            return Promise.resolve(new Error("An unknown error has occurred"));
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

    /**
     * Register the function to get the values for posting
     * @param {1 | 2} customFieldNumber - Whether the handler is for customField1 or customField2 
     * @param {(client: Client) => Promise<string>} handler - Your function to get
     * @returns {Error | null}
     */
    async registerCustomFieldHandler(customFieldNumber, handler) {
        // Check if the handler already exists
        if (this.customFields.get(customFieldNumber)) return new Error("Handler already exists");

        // If it doen't set it
        this.customFields.set(customFieldNumber, handler);
    }
}

module.exports = Statcord;
