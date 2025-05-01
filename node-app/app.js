require('dotenv').config();
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = 3000;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

let accessToken = null;

async function getAccessToken() {
	if (accessToken) {
		return accessToken;
	}
	const response = await axios.post(
	"https://www.warcraftlogs.com/oauth/token",
		new URLSearchParams({ "grant_type": "client_credentials" }),
		{
			auth: {
				username: CLIENT_ID,
				password: CLIENT_SECRET,
			},
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			}
		}
	);
	if (response.status === 200) {
		accessToken = response.data.access_token;
		return accessToken;
	} else {
		throw new Error("Failed to get access token");
	}
}

const LOG_URL = "https://www.warcraftlogs.com/api/v2/client";

async function getSummary(token, cName, sName) {
	try {
	const res = await axios.post(
		LOG_URL,
		{
			query: `
				{
					characterData {
						character(name: "${cName}", serverSlug: "${sName}", serverRegion: "KR") {
						zoneRankings
						}
					}
				}
			` },
		{
			headers: {
				"Authorization": `Bearer ${token}`,
				"Content-Type": "application/json"
			}
		}
	)
		return res.data;
	} catch (err) {
		console.log("eeeerrrr")
		throw err

	}
}

async function test(token, code, fid, page = 0) {
	try {
		const res = await axios.post(
			LOG_URL,
			{
				query : `
				{
					reportData {
						report(code: "${code}") {
							table(fightIDs: [${fid}], dataType: DamageDone, encounterID: 3011, targetID: 348 ${page === 0 ? "" : `, startTime: ${page}`})
						}
					}
				}
				`
			},
			{
				headers: {
					"Authorization": `Bearer ${token}`,
					"Content-Type": "application/json"
				}
			}
		);
		return res.data;
	} catch (err) {
		throw err
	}
}

async function getThirdNamedMob(token, code, fid, tid) {
	try {
		const res = await axios.post(
			LOG_URL,
			{
				query : `
				{
					reportData {
						report(code: "${code}") {
							table(fightIDs: [${fid}], dataType: DamageDone, encounterID: 3011, targetID: ${tid})
							phases {
								encounterID
							}
						}
					}
				}
				`
			},
			{
				headers: {
					"Authorization": `Bearer ${token}`,
					"Content-Type": "application/json"
				}
			}
		);
		return res.data;
	} catch (err) {
		throw err
	}
}

async function getThirdTid(token, code, fid) {
	try {
		const res = await axios.post(
			LOG_URL,
			{
				query: `
					{
						reportData {
							report(code: "${code}") {
								fights(fightIDs: [${fid}]) {
									id
									encounterID
									endTime
									completeRaid
									enemyNPCs {
										id
										gameID
										instanceCount
										groupCount
									}
								}
							}
						}
					}
				`
			},
			{
				headers: {
					"Authorization": `Bearer ${token}`,
					"Content-Type": "application/json"
				}
			}
		);
		return res.data;
	} catch (err) {
		consol.log("err");
		throw err
	}
}

async function getFights(token, cName, sName) {
	try {
		const res = await axios.post(
			LOG_URL,
			{
				query: `
					{
						characterData {
							character(name: "${cName}", serverSlug: "${sName}", serverRegion: "KR") {
								encounterRankings(encounterID: 3011)
							}
						}
					}
				`
			},
			{
				headers: {
					"Authorization": `Bearer ${token}`,
					"Content-Type": "application/json"
				}
			}
		);

		return res.data;
	} catch (err) {
		console.log("err")
		throw err
	}
}

app.get("", async (req, res) => {
	return res.status(200).json({ msg: "Hello World!" });
})

app.get("/thirdNamedMob", async (req, res) => {
	const { cName, sName } = req.query;
	try {
		const token = await getAccessToken();
		const res1 = await getFights(token, cName, sName);
		const ranks = res1.data.characterData.character.encounterRankings.ranks;
		const dd = ranks.map(rank => {
			return { code: rank.report.code, fid: rank.report.fightID }
		});

		if (dd.length === 0) {
			return res.status(404).json({ error: "No data found" });
		}

		const tidRes = await getThirdTid(token, dd[0].code, dd[0].fid);
		const tid = tidRes.data.reportData.report.fights[0].enemyNPCs[0].id;
		const res2 = await getThirdNamedMob(token, dd[0].code, dd[0].fid, tid);
		

		return res.status(200).json(res2.data.reportData.report.table.data.entries.map(entry => {
			return {
				name: entry.name,
				type: entry.type,
				itemLevel: entry.itemLevel,
				totalDamage: entry.total,
				// targets: entry.targets,
			}
		}));
	} catch (err) {
		return res.status(500).json({ error: "Failed to fetch data", data: err });
	}
})

app.get("/summary", async (req, res) => {
	const { cName, sName } = req.query;
	if (!cName || !sName) {
		return res.status(400).json({ error: "Miss param" });
	}

	try {
		const token = await getAccessToken();
		const result = await getSummary(token, cName, sName);
		return res.status(200).json(result);
	} catch (err) {
		return res.status(500).json({ error: "Failed to fetch data" });
	}
})

app.get("/test", async (req, res) => {
	const { cName, fid, sName } = req.query;
	try {
		const token = await getAccessToken();
		// const result = await test(token, code, fid, page);
		const result = await getThirdTid(token, "", 52);
		return res.status(200).json({ result });
	} catch (err) {
		console.error("err :", err.message);
		return res.status(500).json({ error: "Failed to fetch data" });
	}
});

app.listen(PORT, () => {
	console.log(`server running on localhost:${PORT}`);
});

function getSortedDamage(events) {
	const totalDmgBySource = events.reduce((acc, e) => {
		const sourceId = e.sourceID;
		const dmg = e.amount || 0;

		acc[sourceId] = (acc[sourceId] || 0) + dmg;
		return acc;
	}, {});
	console.log(totalDmgBySource);
	return Object.entries(totalDmgBySource)
		.map(([sourceId, totalDmg]) => ({
			sourceId: Number(sourceId),
			totalDmg
		}))
		.sort((a, b) => b.totalDmg - a.totalDmg);
}

function getDamageRanking(pds, sortedDmg) {
	const allPlayers = [
		...(pds.tanks || []),
		...(pds.healers || []),
		...(pds.dps || [])
	];

	const playerMap = Object.fromEntries(
		allPlayers.map(player => [player.id, player])
	);

	return sortedDmg.map(({ sourceId, totalDmg }) => {
		const player = playerMap[sourceId];

		return {
			id: sourceId,
			name: player?.name ?? 'Unknown',
			type: player?.type ?? 'Unknown',
			spec: player?.specs?.[0]?.spec ?? 'Unknown',
			totalDamage: totalDmg
		}
	});
}
