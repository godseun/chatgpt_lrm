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
	return res.status(200).json({ msg: "Hello World!" });
});

app.get("/summary", async (req, res) => {
	let { cName, sName } = req.query;
	if (!sName) {
		sName = "azshara";
	}
	try {
		const result = await WarcraftLog.getCharacterByName(cName, sName, "KR").then(json => {
			if(json !== null) {
				console.log("- ✅   getCharacterByName tested");
				return json;
			} else {
				console.log("- ❌   getCharacterByName tested");
				return null;
			}
		});

		if (result === null) {
			return res.status(500).json({ error: "Failed to fetch data", err_code: 1 });
		}

		const ranks = result.encounterRankings.ranks;
		const dd = ranks.map(rank => {
			return { order: rank.rankPercent, code: rank.report.code, fid: rank.report.fightID }
		});

		let targetSourceId = null;
		let survival = null;
		let myThirdNamedMobChild = null;
		if (dd.length) {
			dd.sort((a, b) => {
				if (a.order < b.order) {
					return 1;
				}
				if (a.order > b.order) {
					return -1;
				}
				return 0;
			});

			const tid = await WarcraftLog.getThirdTid(dd[0].code, dd[0].fid).then(json => {
				if(json !== null) {
					console.log("- ✅   getThirdTid tested");
					return json;
				} else {
					console.log("- ❌   getThirdTid tested");
					return null;
				}
			});
			if (tid === null) {
				return res.status(500).json({ error: "Failed to fetch data", err_code: 2 });
			}

			const namedMobData = await WarcraftLog.getNamedMob(dd[0].code, dd.map(d => d.fid), tid).then(json => {
				if(json !== null) {
					console.log("- ✅   getNamedMob tested");
					return json;
				} else {
					console.log("- ❌   getNamedMob tested");
					return null;
				}
			});
	
			if (namedMobData === null) {
				return res.status(500).json({ error: "Failed to fetch data", err_code: 3 });
			}
			targetSourceId = namedMobData.table.data.entries.filter(entry => entry.name === cName)[0].id;
			myThirdNamedMobChild = namedMobData.table.data.entries.map(entry => {
				return {
					name: entry.name,
					type: entry.type,
					itemLevel: entry.itemLevel,
					totalDamage: entry.total,
				}
			}).sort((a, b) => {
				if (a.totalDamage < b.totalDamage) {
					return 1;
				}
				if (a.totalDamage > b.totalDamage) {
					return -1;
				}
				return 0;
			}).findIndex(entry => entry.name === cName) + 1;

			

			survival = await WarcraftLog.getSurvival(dd[0].code, [dd[0].fid], targetSourceId).then(json => {
				if(json !== null) {
					console.log("- ✅   getSurvival tested");
					return json;
				} else {
					console.log("- ❌   getSurvival tested");
					return null;
				}
			});

			for (let i = 0; i < dd.length; i++) {
				// const surv = await WarcraftLog.getSurvival(dd[i].code, [dd[0].fid], targetSourceId)
			}

			console.log("code :", dd[0].code, "fids :", [dd[0].fid]);
		}

		const progress = result.zoneRankings.rankings.findIndex(rank => rank.rankPercent === null);

		const data = {
			characterName: cName,
			serverName: sName,
			region: "KR",
			bestPerformanceAverage: result.zoneRankings.bestPerformanceAverage,
			difficulty: difficultyTemp[result.zoneRankings.difficulty],
			zone: zoneTemp.filter(zoneData => zoneData.id === result.zoneRankings.zone)[0].name,
			thirdNamedChildMobScores: myThirdNamedMobChild,
			trying: `${progress === -1 ? "올킬" : progress + 1 + "넴" }`,
			zoneRankings: [result.zoneRankings.rankings.map(ranking => {
				return {
					name: ranking.encounter.name,
					rankPercent: ranking.rankPercent,
					totalKills: ranking.totalKills,
					spec: ranking.spec,
					bestAmount: ranking.bestAmount,
				}
			})],
		}

		return res.status(200).json({ survival, data });
	} catch (err) {
		console.error("err :", err.message);
		return res.status(500).json({ error: "Failed to fetch data" });
	}
});

app.get("/test", async (req, res) => {
	try {
		// const result = await WarcraftLog.getCharacterByName("다순이", "azshara", "KR").then(json => {
		// 	if(json !== null) {
		// 		console.log("- ✅   getCharacterByName tested");
		// 		return json;
		// 	} else {
		// 		console.log("- ❌   getCharacterByName tested");
		// 		return null;
		// 	}
		// });

		const result = await WarcraftLog.test().then(json => {
			if(json !== null) {
				console.log("- ✅  tested", json);
				return json;
			} else {
				console.log("- ❌  tested", json);
				return null;
			}
		});

		if (result === null) {
			return res.status(500).json({ error: "Failed to fetch data", err_code: 1 });
		}

		return res.status(200).json(result);
	}
	catch (err) {
		console.error("err :", err.message);
		return res.status(500).json({ error: "Failed to fetch data" });
	}
});

app.listen(PORT, () => {
	console.log(`server running on localhost:${PORT}`);
});

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