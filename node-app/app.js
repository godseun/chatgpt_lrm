require('dotenv').config();
const WarcraftLog = require("./index");
const express = require("express");

const app = express();
const PORT = 3000;

const WL_CLIENT_ID = process.env.CLIENT_ID;
const WL_CLIENT_SECRET = process.env.CLIENT_SECRET;


WarcraftLog.connect(
    WL_CLIENT_ID,
    WL_CLIENT_SECRET
);

app.get("", async (req, res) => {
	return res.status(200).json({ msg: "Hello, World!" });
});

app.get("/policy", async (req, res) => {
	try {
		const policy = await WarcraftLog.getHtml("index").then(html => {
			if(html !== null) {
				console.log("- ✅   getHtml tested");
				return html;
			} else {
				console.log("- ❌   getHtml tested");
				return null;
			}
		});
		return res.status(200).send(policy);
	} catch (error) {
		return res.status(500).json({ error: "Failed to fetch data" });
	}
});

app.get("/summary", async (req, res) => {
	let callCount = 0;
	let { cName, sName } = req.query;
	if (!sName) {
		sName = "azshara";
	}
	try {
		const c_res = await WarcraftLog.getCharacterByName(cName, sName, "KR").then(json => {
			if(json !== null) {
				console.log("- ✅   getCharacterByName tested");
				return json;
			} else {
				console.log("- ❌   getCharacterByName tested");
				return null;
			}
		});
		callCount += 1;

		const statistics = await WarcraftLog.getStatistics(42).then(json => {
			if(json !== null) {
				console.log("- ✅   getStatistics tested");
				return json;
			} else {
				console.log("- ❌   getStatistics tested");
				return null;
			}
		});

		let i = 0;
		const dataMap = {}
		for await (const report of c_res.recentReports.data) {
			for (let j = 0; j < undermineNameds.length; j++) {
				const encounterId = undermineNameds[j];
				const filterReportId = report.fights.filter(fight => fight.encounterID === encounterId);
				if (filterReportId.length === 0) {
					break;
				}

				const fights = filterReportId.map(fight => fight.id);
	
				const resData = await WarcraftLog.namedDpsAndHealingPotion(report.code, fights, encounterId).then(json => {
					if(json !== null) {
						console.log("- ✅   resData tested");
						return json;
					} else {
						console.log("- ❌   resData tested");
						return null;
					}
				});
				callCount += 1;

				const targetDPSDatas = resData.table.data.entries.filter(entry => entry.name === cName);
				if (targetDPSDatas.length === 0) {
					continue;
				}
				const targetData = targetDPSDatas[0];
				const targetSourceId = targetData.id;
				const DPS = targetData.total / ((targetData.activeTime * (targetData.activeTimeReduced / targetData.activeTime)) / 1000);

				// abilityID 생석: 6262, 치물: 431416
				const lifeStone = await WarcraftLog.getSurvival(report.code, fights, "Healing", encounterId, targetSourceId, 6262).then(json => {
					if(json !== null) {
						console.log("- ✅   lifeStone tested");
						return json;
					} else {
						console.log("- ❌   lifeStone tested");
						return null;
					}
				});
				callCount += 1;

				if (dataMap[encounterId] === undefined) {
					// TODO: 직업, 특성 동적처리
					dataMap[encounterId] = {
						statistics: statistics[encounterId]["DPS"]["Death Knight"]["Frost"] || {},
						dps: 0,
						itemLevel: 0,
						tryCount: 0,
						healingPotion: 0,
						lifeStone: 0
					};
				}

				resData.events.data.map(event => {
					if (event.sourceID === targetSourceId) {
						dataMap[encounterId].healingPotion += 1;
					}
				});

				dataMap[encounterId].dps += DPS * fights.length;
				dataMap[encounterId].itemLevel += targetData.itemLevel * fights.length;
				dataMap[encounterId].tryCount += fights.length;
				dataMap[encounterId].lifeStone += lifeStone.events.data.length;
				
				console.log("data: ", report.code, "try: ", fights.length, "targetSourceId:", targetSourceId);
			}
			i++;
			if (i > 2) {
				break;
			}
		}

		console.log("apiCallCount: ", callCount, "code list length: ", c_res.recentReports.data.length);

		Object.entries(dataMap).forEach(([key, value]) => {
			dataMap[key].dps /= dataMap[key].tryCount;
			dataMap[key].itemLevel /= dataMap[key].tryCount;
		});
	

		if (c_res === null) {
			return res.status(500).json({ error: "Failed to fetch data", err_code: 1 });
		}

		const progress = c_res.zoneRankings.rankings.findIndex(rank => rank.rankPercent === null);
		const data = {
			characterName: cName,
			serverName: sName,
			region: "KR",
			bestPerformanceAverage: c_res.zoneRankings.bestPerformanceAverage,
			difficulty: difficultyTemp[c_res.zoneRankings.difficulty],
			zone: zoneTemp.filter(zoneData => zoneData.id === c_res.zoneRankings.zone)[0].name,
			thirdNamedChildMobScores: 0,
			trying: `${progress === -1 ? "올킬" : progress + 1 + "넴" }`,
			zoneRankings: [c_res.zoneRankings.rankings.map(ranking => {
				return {
					name: ranking.encounter.name,
					rankPercent: ranking.rankPercent,
					totalKills: ranking.totalKills,
					spec: ranking.spec,
					bestAmount: ranking.bestAmount,
				}
			})],
			dataMap
		}

		return res.status(200).json(data);
	}
	catch (err) {
		console.error("err :", err.message);
		return res.status(500).json({ error: "Failed to fetch data" });
	}
});

app.get("/test", async (req, res) => {
	const { code, fightId } = req.query;
	if (!code || !fightId) {
		return res.status(400).json({ error: "code or fightId is missing" });
	}
	try {
		// const resData = await WarcraftLog.test(code, fightId).then(json => {
		// 	if(json !== null) {
		// 		console.log("- ✅   test tested");
		// 		return json;
		// 	} else {
		// 		console.log("- ❌   test tested");
		// 		return null;
		// 	}
		// });
		if (resData === null) {
			return res.status(500).json({ error: "Failed to fetch data", err_code: 1 });
		}
		return res.status(200).json({ test: "hello test"});
	}
	catch (err) {
		console.error("err :", err.message);
		return res.status(500).json({ error: "Failed to fetch data" });
	}
});

app.listen(PORT, () => {
	console.log(`server running on localhost:${PORT}`);
});

const undermineNameds = [3009, 3010, 3011, 3012, 3013, 3014, 3015, 3016];
const difficultyTemp = ["", "", "공찾", "일반", "영웅", "신화"];
const zoneTemp = [
	{
	  id: 41,
	  name: 'Delves',
	  expansion: { id: 6, name: 'The War Within' },
	  frozen: false
	},
	{
	  id: 43,
	  name: 'Mythic+ Season 2',
	  expansion: { id: 6, name: 'The War Within' },
	  frozen: false
	},
	{
	  id: 39,
	  name: 'Mythic+ Season 1',
	  expansion: { id: 6, name: 'The War Within' },
	  frozen: true
	},
	{
	  id: 37,
	  name: 'Mythic+ Season 4',
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 36,
	  name: 'Mythic+ Season 3',
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 34,
	  name: 'Mythic+ Season 2',
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 32,
	  name: 'Mythic+ Season 1',
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 30,
	  name: 'Mythic+ Season 4',
	  expansion: { id: 4, name: 'Shadowlands' },
	  frozen: true
	},
	{
	  id: 9,
	  name: 'Mythic+ Dungeons',
	  expansion: { id: 2, name: 'Legion' },
	  frozen: true
	},
	{
	  id: 35,
	  name: "Amirdrassil, the Dream's Hope",
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 33,
	  name: 'Aberrus, the Shadowed Crucible',
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 31,
	  name: 'Vault of the Incarnates',
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 29,
	  name: 'Sepulcher of the First Ones',
	  expansion: { id: 4, name: 'Shadowlands' },
	  frozen: true
	},
	{
	  id: 28,
	  name: 'Sanctum of Domination',
	  expansion: { id: 4, name: 'Shadowlands' },
	  frozen: true
	},
	{
	  id: 26,
	  name: 'Castle Nathria',
	  expansion: { id: 4, name: 'Shadowlands' },
	  frozen: true
	},
	{
	  id: 20,
	  name: 'Mythic+ Dungeons',
	  expansion: { id: 3, name: 'Battle for Azeroth' },
	  frozen: true
	},
	{
	  id: 17,
	  name: 'Antorus, The Burning Throne',
	  expansion: { id: 2, name: 'Legion' },
	  frozen: true
	},
	{
	  id: 13,
	  name: 'Tomb of Sargeras',
	  expansion: { id: 2, name: 'Legion' },
	  frozen: true
	},
	{
	  id: 11,
	  name: 'The Nighthold',
	  expansion: { id: 2, name: 'Legion' },
	  frozen: true
	},
	{
	  id: 42,
	  name: 'Liberation of Undermine',
	  expansion: { id: 6, name: 'The War Within' },
	  frozen: false
	},
	{
	  id: 40,
	  name: 'Blackrock Depths',
	  expansion: { id: 6, name: 'The War Within' },
	  frozen: true
	},
	{
	  id: 38,
	  name: 'Nerub-ar Palace',
	  expansion: { id: 6, name: 'The War Within' },
	  frozen: true
	},
	{
	  id: 27,
	  name: 'Torghast',
	  expansion: { id: 4, name: 'Shadowlands' },
	  frozen: true
	},
	{
	  id: 25,
	  name: 'Mythic+ Seasons 1 - 3',
	  expansion: { id: 4, name: 'Shadowlands' },
	  frozen: true
	},
	{
	  id: 24,
	  name: "Ny'alotha",
	  expansion: { id: 3, name: 'Battle for Azeroth' },
	  frozen: true
	},
	{
	  id: 23,
	  name: 'The Eternal Palace',
	  expansion: { id: 3, name: 'Battle for Azeroth' },
	  frozen: true
	},
	{
	  id: 22,
	  name: 'Crucible of Storms',
	  expansion: { id: 3, name: 'Battle for Azeroth' },
	  frozen: true
	},
	{
	  id: 21,
	  name: "Battle of Dazar'alor",
	  expansion: { id: 3, name: 'Battle for Azeroth' },
	  frozen: true
	},
	{
	  id: 19,
	  name: 'Uldir',
	  expansion: { id: 3, name: 'Battle for Azeroth' },
	  frozen: true
	},
	{
	  id: 12,
	  name: 'Trial of Valor',
	  expansion: { id: 2, name: 'Legion' },
	  frozen: true
	},
	{
	  id: 10,
	  name: 'Emerald Nightmare',
	  expansion: { id: 2, name: 'Legion' },
	  frozen: true
	},
	{
	  id: 8,
	  name: 'Hellfire Citadel',
	  expansion: { id: 1, name: 'Warlords of Draenor' },
	  frozen: true
	},
	{
	  id: 7,
	  name: 'Blackrock Foundry',
	  expansion: { id: 1, name: 'Warlords of Draenor' },
	  frozen: true
	},
	{
	  id: 6,
	  name: 'Highmaul',
	  expansion: { id: 1, name: 'Warlords of Draenor' },
	  frozen: true
	},
	{
	  id: 5,
	  name: 'Siege of Orgrimmar',
	  expansion: { id: 0, name: 'Mists of Pandaria' },
	  frozen: true
	},
	{
	  id: 4,
	  name: 'Throne of Thunder',
	  expansion: { id: 0, name: 'Mists of Pandaria' },
	  frozen: true
	},
	{
	  id: 3,
	  name: 'Challenge Modes',
	  expansion: { id: 1, name: 'Warlords of Draenor' },
	  frozen: true
	}
];