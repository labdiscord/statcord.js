/// <reference path="./index.d.ts" />

import { Client, ShardingClient } from "statcord.js-beta";
import * as Discord from "discord.js";

const client = new Client({
    client: new Discord.Client(),
    key: "",
    postCpuStatistics: true,
    postMemStatistics: true,
    postNetworkStatistics: true
});

const sClient = new ShardingClient({
    manager: new Discord.ShardingManager(""),
    key: "",
    autopost: true,
    postCpuStatistics: true,
    postMemStatistics: true,
    postNetworkStatistics: true
});