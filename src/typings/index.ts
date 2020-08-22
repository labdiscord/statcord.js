/// <reference path="./index.d.ts" />
// TESTS
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

client.on("post", (status) => {});
client.on("autopost-start", () => {});

sClient.on("post", (status) => {});
sClient.on("autopost-start", () => {});