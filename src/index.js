// Export normal client
module.exports.Client = require("./main");
// Export sharding client
module.exports.ShardingClient = require("./shard");

/*
Note in files the following string will be seen "|=-ssc-=|".
This string is used to separate arguments in messages for the statcord client
*/