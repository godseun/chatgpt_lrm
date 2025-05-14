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
	console.time("summary 전체 처리 시간");
	let callCount = 0;
	let { cName, sName } = req.query;
	if (!sName) {
		sName = "azshara";
	}

	try {
		const [c_res] = await Promise.all([
			WarcraftLog.getCharacterByName(cName, sName, "KR"),
			// WarcraftLog.getStatistics(42)
		]);
		callCount += 2;

		if (!c_res) {
			return res.status(500).json({ error: "Failed to fetch character", err_code: 1 });
		}

		const dataMap = {};
		const reports = c_res.recentReports.data;
		// const reports = c_res.recentReports.data.slice(0, 3); // 최대 3개

		if (!c_res.zoneRankings.bestPerformanceAverage) {
			console.log(cName, sName);
			console.timeEnd("summary 전체 처리 시간");
			return res.status(200).json(null);
		}
	
		// 🧠 리포트 + 엔카운터 병렬화
		await Promise.all(
			reports.map(async (report) => {
				await Promise.all(
					undermineNameds.map(async ({ id }) => {
						const fights = report.fights.filter(f => f.encounterID === id && f.difficulty === c_res.zoneRankings.difficulty).map(f => f.id);
						if (fights.length === 0) return;

						const resData = await WarcraftLog.namedDpsAndHealingPotion(report.code, fights, id);
						callCount += 1;
						if (!resData) return;

						const targetDPSDatas = resData.table.data.entries.filter(entry => entry.name === cName);
						if (targetDPSDatas.length === 0) return;

						const targetData = targetDPSDatas[0];

						const targetSourceId = targetData.id;
						// const DPS = targetData.total / ((targetData.activeTime * (targetData.activeTimeReduced / targetData.activeTime)) / 1000);

						const lifeStone = await WarcraftLog.getSurvival(report.code, fights, "Healing", id, targetSourceId, 6262);
						callCount += 1;
						if (!lifeStone) return;

						if (!dataMap[id]) {
							dataMap[id] = {
								// statistics: statistics[id]?.DPS?.["Death Knight"]?.["Frost"] || {},
								// dps: 0,
								// itemLevel: 0,
								tryCount: 0,
								healingPotion: 0,
								lifeStone: 0
							};
						}

						resData.events.data.forEach(event => {
							if (event.sourceID === targetSourceId) {
								dataMap[id].healingPotion += 1;
							}
						});

						// dataMap[id].dps += DPS * fights.length;
						// dataMap[id].itemLevel += targetData.itemLevel * fights.length;
						dataMap[id].tryCount += fights.length;
						dataMap[id].lifeStone += lifeStone.events.data.length;

						// console.log("data: ", report.code, "try: ", fights.length, "targetSourceId:", targetSourceId);
					})
				);
			})
		);

		const survTemp = {
			tryCount: 0,
			healingPotion: 0,
			lifeStone: 0
		}
		Object.entries(dataMap).forEach(([key, value]) => {
			survTemp.tryCount += value.tryCount;
			survTemp.healingPotion += value.healingPotion;
			survTemp.lifeStone += value.lifeStone;
		});

		const gameData = c_res.gameData.global;
		let classSalt = "";
		if (gameData.character_class.name === "마법사") {
			classSalt += " Mage"
		} else if (gameData.character_class.name === "드루이드") {
			classSalt += " Druid"
		} else if (gameData.character_class.name === "성기사") {
			classSalt += " Paladin"
		}

		let msg1 = "";
		if (c_res.zoneRankings.bestPerformanceAverage >= 80) {
			msg1 = "상위권이며";
		} else if (c_res.zoneRankings.bestPerformanceAverage >= 40) {
			msg1 = "평균적이며";
		} else {
			msg1 = "다소 낮은 편이며";
		}

		let msg2 = "";
		if ((survTemp.healingPotion + survTemp.lifeStone) / survTemp.tryCount >= 0.5) {
			msg2 = "생존성이 좋은 플레이를 하고";
		} else if ((survTemp.healingPotion + survTemp.lifeStone) / survTemp.tryCount >= 0.1) {
			msg2 = "안정적인 플레이를 하고";
		} else {
			msg2 = "유리대포 성향이";
		}

		let recurit = true;
		if (c_res.zoneRankings.bestPerformanceAverage < 40 && (survTemp.healingPotion + survTemp.lifeStone) / survTemp.tryCount < 0.1) {
			recurit = false;
		}

		const progress = c_res.zoneRankings.rankings.findIndex(rank => rank.rankPercent === null);
		const data = {
			characterName: cName,
			serverName: sName,
			region: "KR",
			bestPerformanceAverage: c_res.zoneRankings.bestPerformanceAverage,
			scoreColor: getRogColor(c_res.zoneRankings.bestPerformanceAverage),
			summary: `현재 ${difficultyTemp[c_res.zoneRankings.difficulty]}에서 딜량이 ${msg1}, ${msg2} 있습니다.`,
			recurit: recurit,
			difficulty: difficultyTemp[c_res.zoneRankings.difficulty],
			zone: zoneTemp.find(z => z.id === c_res.zoneRankings.zone)?.krName || "Unknown",
			trying: `${progress === -1 ? "올킬을 완료 하였습니다." : progress + 1 + "넴을 공략하고 있습니다."}`,
			zoneRankings: [
				c_res.zoneRankings.rankings.map(ranking => {
					if (ranking.rankPercent !== null) {
						return {
							name: undermineNameds.find(named => named.id === ranking.encounter.id).krName,
							rankPercent: ranking.rankPercent,
							scoreColor: getRogColor(ranking.rankPercent),
							totalKills: ranking.totalKills,
							spec: classTemp[ranking.spec + classSalt],
							bestAmount: ranking.bestAmount,
						}
					}
				})
			],
			dataMap: Object.entries(dataMap).map(([key, value]) => ({
				name: undermineNameds.find(named => named.id === parseInt(key)).krName,
				// dps: value.dps,
				// itemLevel: value.itemLevel,
				tryCount: value.tryCount,
				healingPotion: value.healingPotion,
				lifeStone: value.lifeStone,
			})),
			link: `https://www.warcraftlogs.com/character/id/${c_res.id}`,
		};

		console.log(cName, sName, "apiCallCount: ", callCount, "code list length: ", reports.length);
		
		console.timeEnd("summary 전체 처리 시간");
		
		return res.status(200).json(data);

	} catch (err) {
		console.error("err:", err.message);
		return res.status(500).json({ error: "Failed to fetch data" });
	}
});

app.get("/test", async (req, res) => {
	try {
		const [c_res, statistics] = await Promise.all([
			WarcraftLog.getCharacterByName("Choechoi", "azshara", "KR"),
			// WarcraftLog.getStatistics(42)
		]);

		// const resData = await WarcraftLog.test().then(json => {
		// 	if(json !== null) {
		// 		console.log("- ✅   test tested");
		// 		return json;
		// 	} else {
		// 		console.log("- ❌   test tested");
		// 		return null;
		// 	}
		// });
		if (c_res === null) {
			return res.status(500).json({ error: "Failed to fetch data", err_code: 1 });
		}
		return res.status(200).json(c_res);
	}
	catch (err) {
		console.error("err :", err.message);
		return res.status(500).json({ error: "Failed to fetch data" });
	}
});

app.listen(PORT, () => {
	console.log(`server running on localhost:${PORT}`);
});

function getRogColor(value) {
	if (value >= 0 && value < 25) {
		return "⚪️";
	} else if (value >= 25 && value < 50) {
		return "🟢";
	} else if (value >= 50 && value < 80) {
		return "🔵";
	} else if (value >= 80 && value < 95) {
		return "🟣";
	} else if (value >= 95 && value < 99) {
		return "🟠";
	} else {
		return "🟡";
	}
}

const classTemp = {
	"Blood": "혈죽",
	"Frost": "냉죽",
	"Unholy": "부죽",
	"Elemental": "정술",
	"Enhancement": "고양",
	"Restoration": "복술",
	"Destruction": "파흑",
	"Demonology": "악흑",
	"Affliction": "고흑",
	"Fury": "분전",
	"Arms": "무전",
	"Protection": "전탱",
	"Assassination": "암살",
	"Outlaw": "무법",
	"Subtlety": "잠행",
	"Shadow": "암사",
	"Disciplines": "수사",
	"Holy": "신사",
	"Retribution Paladin": "징벌",
	"Protection Paladin": "보기",
	"Holy Paladin": "신기",
	"Brewmaster": "양조",
	"Windwalker": "풍운",
	"Mistweaver": "운무",
	"Arcane Mage": "비법",
	"Fire Mage": "화법",
	"Frost Mage": "냉법",
	"BeastMastery": "야수",
	"Marksmanship": "사격",
	"Survival": "생존",
	"Devastation": "황폐",
	"Preservation": "보존",
	"Augmentation": "증강",
	"Guardian Druid": "곰탱",
	"Feral Druid": "야드",
	"Balance Druid": "조드",
	"Restoration Druid": "회드",
	"Vengeance": "악탱",
	"Havoc": "악딜",
}
const undermineNameds = [
	{ id: 3009, krName: "벡시와 연마공", },
	{ id: 3010, krName: "살육의 도가니", },
	{ id: 3011, krName: "리크 리버브", },
	{ id: 3012, krName: "스틱스 벙크정커", },
	{ id: 3013, krName: "스프로켓몽거 로켄스톡", },
	{ id: 3014, krName: "외팔이 좀도둑", },
	{ id: 3015, krName: "보안 책임자 머그지", },
	{ id: 3016, krName: "크롬왕 갤러윅스", },
];
const difficultyTemp = ["", "", "공찾", "일반", "영웅", "신화"];
const zoneTemp = [
	{
	  id: 41,
	  name: 'Delves',
		krName: '',
	  expansion: { id: 6, name: 'The War Within' },
	  frozen: false
	},
	{
	  id: 43,
	  name: 'Mythic+ Season 2',
		krName: '',
	  expansion: { id: 6, name: 'The War Within' },
	  frozen: false
	},
	{
	  id: 39,
	  name: 'Mythic+ Season 1',
		krName: '',
	  expansion: { id: 6, name: 'The War Within' },
	  frozen: true
	},
	{
	  id: 37,
	  name: 'Mythic+ Season 4',
		krName: '',
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 36,
	  name: 'Mythic+ Season 3',
		krName: '',
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 34,
	  name: 'Mythic+ Season 2',
		krName: '',
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 32,
	  name: 'Mythic+ Season 1',
		krName: '',
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 30,
	  name: 'Mythic+ Season 4',
		krName: '',
	  expansion: { id: 4, name: 'Shadowlands' },
	  frozen: true
	},
	{
	  id: 9,
	  name: 'Mythic+ Dungeons',
		krName: '',
	  expansion: { id: 2, name: 'Legion' },
	  frozen: true
	},
	{
	  id: 35,
	  name: "Amirdrassil, the Dream's Hope",
		krName: '',
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 33,
	  name: 'Aberrus, the Shadowed Crucible',
		krName: '',
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 31,
	  name: 'Vault of the Incarnates',
		krName: '',
	  expansion: { id: 5, name: 'Dragonflight' },
	  frozen: true
	},
	{
	  id: 29,
	  name: 'Sepulcher of the First Ones',
		krName: '',
	  expansion: { id: 4, name: 'Shadowlands' },
	  frozen: true
	},
	{
	  id: 28,
	  name: 'Sanctum of Domination',
		krName: '',
	  expansion: { id: 4, name: 'Shadowlands' },
	  frozen: true
	},
	{
	  id: 26,
	  name: 'Castle Nathria',
		krName: '',
	  expansion: { id: 4, name: 'Shadowlands' },
	  frozen: true
	},
	{
	  id: 20,
	  name: 'Mythic+ Dungeons',
		krName: '',
	  expansion: { id: 3, name: 'Battle for Azeroth' },
	  frozen: true
	},
	{
	  id: 17,
	  name: 'Antorus, The Burning Throne',
		krName: '',
	  expansion: { id: 2, name: 'Legion' },
	  frozen: true
	},
	{
	  id: 13,
	  name: 'Tomb of Sargeras',
		krName: '',
	  expansion: { id: 2, name: 'Legion' },
	  frozen: true
	},
	{
	  id: 11,
	  name: 'The Nighthold',
		krName: '',
	  expansion: { id: 2, name: 'Legion' },
	  frozen: true
	},
	{
	  id: 42,
	  name: 'Liberation of Undermine',
		krName: '언더마인 해방전선',
	  expansion: { id: 6, name: 'The War Within' },
	  frozen: false
	},
	{
	  id: 40,
	  name: 'Blackrock Depths',
		krName: '',
	  expansion: { id: 6, name: 'The War Within' },
	  frozen: true
	},
	{
	  id: 38,
	  name: 'Nerub-ar Palace',
		krName: '',
	  expansion: { id: 6, name: 'The War Within' },
	  frozen: true
	},
	{
	  id: 27,
	  name: 'Torghast',
		krName: '',
	  expansion: { id: 4, name: 'Shadowlands' },
	  frozen: true
	},
	{
	  id: 25,
	  name: 'Mythic+ Seasons 1 - 3',
		krName: '',
	  expansion: { id: 4, name: 'Shadowlands' },
	  frozen: true
	},
	{
	  id: 24,
	  name: "Ny'alotha",
		krName: '',
	  expansion: { id: 3, name: 'Battle for Azeroth' },
	  frozen: true
	},
	{
	  id: 23,
	  name: 'The Eternal Palace',
		krName: '',
	  expansion: { id: 3, name: 'Battle for Azeroth' },
	  frozen: true
	},
	{
	  id: 22,
	  name: 'Crucible of Storms',
		krName: '',
	  expansion: { id: 3, name: 'Battle for Azeroth' },
	  frozen: true
	},
	{
	  id: 21,
	  name: "Battle of Dazar'alor",
		krName: '',
	  expansion: { id: 3, name: 'Battle for Azeroth' },
	  frozen: true
	},
	{
	  id: 19,
	  name: 'Uldir',
		krName: '',
	  expansion: { id: 3, name: 'Battle for Azeroth' },
	  frozen: true
	},
	{
	  id: 12,
	  name: 'Trial of Valor',
		krName: '',
	  expansion: { id: 2, name: 'Legion' },
	  frozen: true
	},
	{
	  id: 10,
	  name: 'Emerald Nightmare',
		krName: '',
	  expansion: { id: 2, name: 'Legion' },
	  frozen: true
	},
	{
	  id: 8,
	  name: 'Hellfire Citadel',
		krName: '',
	  expansion: { id: 1, name: 'Warlords of Draenor' },
	  frozen: true
	},
	{
	  id: 7,
	  name: 'Blackrock Foundry',
		krName: '',
	  expansion: { id: 1, name: 'Warlords of Draenor' },
	  frozen: true
	},
	{
	  id: 6,
	  name: 'Highmaul',
		krName: '',
	  expansion: { id: 1, name: 'Warlords of Draenor' },
	  frozen: true
	},
	{
	  id: 5,
	  name: 'Siege of Orgrimmar',
		krName: '',
	  expansion: { id: 0, name: 'Mists of Pandaria' },
	  frozen: true
	},
	{
	  id: 4,
	  name: 'Throne of Thunder',
		krName: '',
	  expansion: { id: 0, name: 'Mists of Pandaria' },
	  frozen: true
	},
	{
	  id: 3,
	  name: 'Challenge Modes',
		krName: '',
	  expansion: { id: 1, name: 'Warlords of Draenor' },
	  frozen: true
	}
];