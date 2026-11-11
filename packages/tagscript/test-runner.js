import {
  ReactionRoleType,
  AutomodAction,
  SuggestionStatus,
  InfractionAction,
  LogEventType,
  PermissionFlags,
  hasPermission,
  getPermissionNames,
} from "../config/dist/index.js";

import {
  executeTagScript,
  parseTagScript,
  evaluateMath,
} from "./dist/index.js";

import { prisma, getOrCreateGuild, getNextInfractionCaseId, getNextSuggestionNumber } from "../database/dist/index.js";

import assert from "node:assert";

console.log("=== RUNNING EXTENSIVE TEST SUITE FOR TORTUGA CORE PACKAGES ===");

// 1. CONFIG PACKAGE VERIFICATION
console.log("\n[1] Testing @tortuga/config Enums & Permissions...");

assert.strictEqual(ReactionRoleType.NORMAL, "NORMAL");
assert.strictEqual(ReactionRoleType.UNIQUE, "UNIQUE");
assert.strictEqual(ReactionRoleType.VERIFY, "VERIFY");
assert.strictEqual(ReactionRoleType.REVERSE, "REVERSE");
assert.strictEqual(ReactionRoleType.BINDING, "BINDING");
assert.strictEqual(ReactionRoleType.DROP, "DROP");
assert.strictEqual(ReactionRoleType.LIMIT, "LIMIT");

assert.strictEqual(AutomodAction.WARN, "WARN");
assert.strictEqual(AutomodAction.TIMEOUT, "TIMEOUT");
assert.strictEqual(AutomodAction.KICK, "KICK");
assert.strictEqual(AutomodAction.BAN, "BAN");
assert.strictEqual(AutomodAction.DELETE_MESSAGE, "DELETE_MESSAGE");

assert.strictEqual(SuggestionStatus.PENDING, "PENDING");
assert.strictEqual(SuggestionStatus.APPROVED, "APPROVED");
assert.strictEqual(SuggestionStatus.DENIED, "DENIED");
assert.strictEqual(SuggestionStatus.CONSIDERED, "CONSIDERED");

assert.strictEqual(InfractionAction.WARN, "WARN");
assert.strictEqual(InfractionAction.TIMEOUT, "TIMEOUT");
assert.strictEqual(InfractionAction.BAN, "BAN");

// Permission checks
assert.strictEqual(hasPermission(PermissionFlags.ADMINISTRATOR, PermissionFlags.BAN_MEMBERS), true);
assert.strictEqual(hasPermission(PermissionFlags.MANAGE_MESSAGES, PermissionFlags.MANAGE_MESSAGES), true);
assert.strictEqual(hasPermission(PermissionFlags.SEND_MESSAGES, PermissionFlags.BAN_MEMBERS), false);

const permsList = getPermissionNames(PermissionFlags.SEND_MESSAGES | PermissionFlags.EMBED_LINKS);
assert.ok(permsList.includes("SEND_MESSAGES"));
assert.ok(permsList.includes("EMBED_LINKS"));
console.log("✓ @tortuga/config passed!");

// 2. DATABASE PACKAGE VERIFICATION
console.log("\n[2] Testing @tortuga/database Exports...");
assert.ok(prisma, "Prisma singleton must exist");
assert.strictEqual(typeof getOrCreateGuild, "function");
assert.strictEqual(typeof getNextInfractionCaseId, "function");
assert.strictEqual(typeof getNextSuggestionNumber, "function");
console.log("✓ @tortuga/database passed!");

// 3. TAGSCRIPT MATH EVALUATION
console.log("\n[3] Testing Math Evaluator...");
assert.strictEqual(evaluateMath("10 + 5 * 2"), 20);
assert.strictEqual(evaluateMath("(10 + 5) * 2"), 30);
assert.strictEqual(evaluateMath("2 ^ 3"), 8);
assert.strictEqual(evaluateMath("10 % 3"), 1);
assert.strictEqual(evaluateMath("round(4.7)"), 5);
assert.strictEqual(evaluateMath("floor(4.9)"), 4);
assert.strictEqual(evaluateMath("ceil(4.1)"), 5);
assert.strictEqual(evaluateMath("min(10, 5, 20)"), 5);
assert.strictEqual(evaluateMath("max(10, 5, 20)"), 20);
assert.strictEqual(evaluateMath("abs(-42)"), 42);
assert.strictEqual(evaluateMath("sqrt(64)"), 8);
console.log("✓ Math evaluator passed!");

// 4. TAGSCRIPT VARIABLES & CONTEXT
console.log("\n[4] Testing TagScript Variables & Context...");
const mockContext = {
  user: {
    id: "123456789012345678",
    name: "CaptainJack",
    discriminator: "0001",
    tag: "CaptainJack#0001",
    mention: "<@123456789012345678>",
    avatar: "https://cdn.discordapp.com/avatars/123/abc.png",
  },
  guild: {
    id: "987654321098765432",
    name: "Tortuga Island",
    members: 1337,
    icon: "https://cdn.discordapp.com/icons/987/def.png",
    ownerId: "123456789012345678",
  },
  channel: {
    id: "112233445566778899",
    name: "general",
    mention: "<#112233445566778899>",
  },
  target: {
    id: "998877665544332211",
    name: "Blackbeard",
    mention: "<@998877665544332211>",
    avatar: "https://cdn.discordapp.com/avatars/998/ghi.png",
  },
  args: ["ban", "for", "mutiny", "on", "the", "ship"],
  variables: {
    customRole: "Navigator",
    serverLevel: 5,
  },
};

async function testTag(template, expected, context = mockContext) {
  const res = await executeTagScript(template, context);
  assert.strictEqual(res.content, expected, `Failed for template: ${template}\nGot: ${res.content}\nExpected: ${expected}`);
}

await testTag("Hello {user}", "Hello CaptainJack");
await testTag("User ID: {user.id}", "User ID: 123456789012345678");
await testTag("User Mention: {user.mention}", "User Mention: <@123456789012345678>");
await testTag("User Name: {user.name}", "User Name: CaptainJack");
await testTag("Server: {server}", "Server: Tortuga Island");
await testTag("Server ID: {server.id}", "Server ID: 987654321098765432");
await testTag("Server Members: {server.members}", "Server Members: 1337");
await testTag("Channel: {channel}", "Channel: <#112233445566778899>");
await testTag("Channel ID: {channel.id}", "Channel ID: 112233445566778899");
await testTag("Target: {target}", "Target: Blackbeard");
await testTag("Target ID: {target.id}", "Target ID: 998877665544332211");
await testTag("Target Mention: {target.mention}", "Target Mention: <@998877665544332211>");
await testTag("Args: {args}", "Args: ban for mutiny on the ship");
await testTag("Args[0]: {args:0}", "Args[0]: ban");
await testTag("Args[1+]: {args:1+}", "Args[1+]: for mutiny on the ship");
await testTag("Custom Variable: {customRole}", "Custom Variable: Navigator");
console.log("✓ TagScript Variables passed!");

// 5. CHOICE & RANDOM
console.log("\n[5] Testing Choice & Random...");
const chooseRes = await executeTagScript("{choose:apple|banana|orange}");
assert.ok(["apple", "banana", "orange"].includes(chooseRes.content));

const chooseNested = await executeTagScript("{choose:{user.name}|{target.name}}", mockContext);
assert.ok(["CaptainJack", "Blackbeard"].includes(chooseNested.content));

const randomRes = await executeTagScript("{random:1-10}");
const num = parseInt(randomRes.content, 10);
assert.ok(num >= 1 && num <= 10, `Random number ${num} out of bounds`);
console.log("✓ Choice & Random passed!");

// 6. LOGIC / IF
console.log("\n[6] Testing Logic / If...");
await testTag("{if(1 == 1):Yes|No}", "Yes");
await testTag("{if(1 == 2):Yes|No}", "No");
await testTag("{if({user.name} == CaptainJack):Welcome Captain!|Intruder!}", "Welcome Captain!");
await testTag("{if(10 > 5):Greater|Lesser}", "Greater");
await testTag("{if(2 > 10):Greater|Lesser}", "Lesser");
await testTag("{if(Tortuga contains tuga):Found|Not found}", "Found");
await testTag("{if(Caribbean startswith Cari):Starts|Nope}", "Starts");
await testTag("{if(Treasure endswith sure):Ends|Nope}", "Ends");
await testTag("{if({args:0} == ban):Banning user|Allowing user}", "Banning user");
console.log("✓ Logic / If passed!");

// 7. MATH TAG
console.log("\n[7] Testing Math Tag...");
await testTag("Result: {math:10 + 5 * 2}", "Result: 20");
await testTag("Score: {math:(50 / 2) + 5}", "Score: 30");
await testTag("Power: {math:2 ^ 4}", "Power: 16");
console.log("✓ Math Tag passed!");

// 8. EMBED JSON & STANDALONE EMBED TAGS
console.log("\n[8] Testing Embed JSON & Builder Tags...");
const embedJsonResult = await executeTagScript(
  '{embed:{"title":"Hello {user.name}","description":"Welcome to {server.name}!","color":16711680}}',
  mockContext
);
assert.ok(embedJsonResult.embed);
assert.strictEqual(embedJsonResult.embed.title, "Hello CaptainJack");
assert.strictEqual(embedJsonResult.embed.description, "Welcome to Tortuga Island!");
assert.strictEqual(embedJsonResult.embed.color, 16711680);

const embedBuilderResult = await executeTagScript(
  "{title:Pirate Flag} {description:Hoist the sails} {color:#ed4245} {field:Bounty|10,000 Gold|true} {field:Ship|Black Pearl|false} {footer:Set sail!|https://cdn.tortuga.io/ship.png}",
  mockContext
);
assert.ok(embedBuilderResult.embed);
assert.strictEqual(embedBuilderResult.embed.title, "Pirate Flag");
assert.strictEqual(embedBuilderResult.embed.description, "Hoist the sails");
assert.strictEqual(embedBuilderResult.embed.color, 0xed4245);
assert.strictEqual(embedBuilderResult.embed.fields?.length, 2);
assert.strictEqual(embedBuilderResult.embed.fields?.[0].name, "Bounty");
assert.strictEqual(embedBuilderResult.embed.fields?.[0].value, "10,000 Gold");
assert.strictEqual(embedBuilderResult.embed.fields?.[0].inline, true);
assert.strictEqual(embedBuilderResult.embed.fields?.[1].name, "Ship");
assert.strictEqual(embedBuilderResult.embed.fields?.[1].value, "Black Pearl");
assert.strictEqual(embedBuilderResult.embed.fields?.[1].inline, false);
assert.strictEqual(embedBuilderResult.embed.footer?.text, "Set sail!");
assert.strictEqual(embedBuilderResult.embed.footer?.icon_url, "https://cdn.tortuga.io/ship.png");
console.log("✓ Embed parsing passed!");

// 9. ESCAPING
console.log("\n[9] Testing Escaping...");
await testTag("Literal \\{user\\} tag", "Literal {user} tag");
await testTag("Literal \\| pipe", "Literal | pipe");
console.log("✓ Escaping passed!");

// 10. ACTIONS ({delete}, {silent})
console.log("\n[10] Testing Control Actions...");
const actionResult = await executeTagScript("Hello {delete} {silent}");
assert.strictEqual(actionResult.content, "Hello");
assert.strictEqual(actionResult.actions.deleteMessage, true);
assert.strictEqual(actionResult.actions.silent, true);
console.log("✓ Actions passed!");

console.log("\n=======================================================");
console.log("🎉 ALL 10 TEST SUITES PASSED! 100% OPERATIONAL!");
console.log("=======================================================");
