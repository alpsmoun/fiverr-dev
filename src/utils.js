import Dexie from "dexie";
import axios from "axios";
import $ from "jquery";
import moment from "moment";

import {
	APIInterval,
	DatabaseName,
	ExportTypes,
	FiverrDB,
	FiverrUrl,
	MaxPageCount,
	PageUnit,
	UsersInitUrlSuffix,
	UsersPageUrlSuffix,
	OnlineUsersInitUrlSuffix,
	OnlineUsersPageUrlSuffix,
	ExportUnit,
} from "./const";

const createDB = () => {
	FiverrDB = new Dexie(DatabaseName);

	FiverrDB.version(1).stores({ users: "username, userId" });
	FiverrDB.version(1).stores({ online_users: "username, userId" });
	FiverrDB.version(1).stores({ category: "++id" });
	FiverrDB.version(1).stores({ date: "++id" });
};

const exportTable = (db, type) => {
	return new Promise((resolve, reject) => {
		if (!db) {
			reject(false);
		}
		exportTableToJson(db, type)
			.then((result) => {
				console.save(result, `${type}.json`);
				resolve(true);
			})
			.catch((error) => {
				console.error("Something went wrong during export:", error);
				resolve(false);
			});
	});
};

const exportMain = (db, count) => {
	return new Promise((resolve, reject) => {
		if (!db) {
			reject(false);
		}
		exportMainToJson(db, count)
			.then((result) => {
				console.save(result, `${ExportTypes.Main}.json`);
				resolve(true);
			})
			.catch((error) => {
				console.error("Something went wrong during export:", error);
				resolve(false);
			});
	});
};

const clearOnlineUsersTable = async (db) => {
	await db.online_users.clear();
};

const refreshCategoryList = async (db, categoryList) => {
	await db.category.clear();

	db.category
		.bulkPut(categoryList)
		.then(function (lastKey) {
			console.log(`Success to add ${categoryList.length} categories`);
		})
		.catch(Dexie.BulkError, function (e) {
			console.error(
				`Some categories did not succeed. However, ${
					categoryList.length - e.failures.length
				} categories was added successfully`
			);
		});
};

const getCategoryList = (db) => {
	return new Promise((resolve, reject) => {
		db.table(ExportTypes.Category)
			.toArray()
			.then((result) => {
				resolve(result);
			})
			.catch((error) => {
				resolve([]);
			});
	});
};
//this is the important and kernel part
const clearAll = (db) => {
	db.category.clear();
	db.date.clear();
	db.online_users.clear();
	db.users.clear();
};

const addUser = async (db, user, isOnline) => {
	if (isOnline) {
		db.online_users.put(user);
		// .then(() => {
		// 	console.log(`Success to put ${user.username} to online_users table`);
		// })
		// .catch((e) => {
		// 	console.error(`Fail to put ${user.username} to online_users table`);
		// });
	}
	db.users.put(user);
	// .then(() => {
	// 	console.log(`Success to put ${user.username} to users table`);
	// })
	// .catch((e) => {
	// 	console.error(`Fail to put ${user.username} to users table`);
	// });
};

const updateUsersByCategory = async (category, isOnline) => {
	try {
		const categoryName = category.name;
		const usersInitUrl =
			category.url + (isOnline ? OnlineUsersInitUrlSuffix : UsersInitUrlSuffix);
		console.log("--- crn_dev --- usersInitUrl:", usersInitUrl);
		const pageCount = await fetchPageCountByUrl(usersInitUrl);
		let userList = [];
		const fetchedList = await fetchUsersByUrl(usersInitUrl, categoryName);
		userList = [...userList, ...fetchedList];
		setStatusProgress(`1/${pageCount}`);
		for (let i = 2; i <= pageCount; i++) {
			const pageUrl =
				category.url +
				(isOnline ? OnlineUsersPageUrlSuffix : UsersPageUrlSuffix) +
				String(i);
			const fetchedList = await fetchUsersByUrl(pageUrl, categoryName);
			userList = [...userList, ...fetchedList];
			setStatusProgress(`${i}/${pageCount}`);
		}

		for (const item of userList) {
			addUser(FiverrDB, item, isOnline);
		}
	} catch (error) {
		console.error(error);
	}
};

async function fetchPageCountByUrl(url) {
	setStatusText("Fetching page count");
	const response = await axios.get(url);
	await sleep(getRandomInterval());
	setStatusText("...");

	const htmlBody = $(response.data);
	const serviceAvailable = $(
		"div.results-info > div.number-of-results > span",
		htmlBody
	).html();

	let validPageCount = 0;
	if (serviceAvailable) {
		const userCount = parseInt(serviceAvailable.replace(/,/g, ""));
		const pageCount = Math.ceil(userCount / PageUnit);
		validPageCount = Math.min(pageCount, MaxPageCount);
	}

	return validPageCount;
}

async function fetchUsersByUrl(url, category) {
	setStatusText(`Fetching users of ${category}`);
	const response = await axios.get(url);
	await sleep(getRandomInterval());
	setStatusText("...");
	const responseHtml = response.data;

	const usernameStart = `"seller_name":"`;
	const usernameEnd = `",`;
	const userIdStart = `"seller_id":`;
	const userIdEnd = `,`;
	const countryStart = `"seller_country":"`;
	const countryEnd = `",`;
	const avatarStart = `"seller_img":"`;
	const avatarEnd = `",`;
	const onlineStart = `"seller_online":`;
	const onlineEnd = `,`;
	const rateCountStart = `"buying_review_rating_count":`;
	const rateCountEnd = `,`;
	const rateScoreStart = `"buying_review_rating":`;
	const rateScoreEnd = `,`;
	const IndicesList = [];
	let usernameStartIndex = responseHtml.indexOf(usernameStart, 0);
	while (usernameStartIndex >= 0) {
		const baseIndex = usernameStartIndex;
		const usernameEndIndex = responseHtml.indexOf(
			usernameEnd,
			usernameStartIndex + usernameStart.length
		);
		const userIdStartIndex = responseHtml.indexOf(userIdStart, baseIndex);
		const userIdEndIndex = responseHtml.indexOf(
			userIdEnd,
			userIdStartIndex + userIdStart.length
		);
		const countryStartIndex = responseHtml.indexOf(countryStart, baseIndex);
		const countryEndIndex = responseHtml.indexOf(
			countryEnd,
			countryStartIndex + countryStart.length
		);
		const avatarStartIndex = responseHtml.indexOf(avatarStart, baseIndex);
		const avatarEndIndex = responseHtml.indexOf(
			avatarEnd,
			avatarStartIndex + avatarStart.length
		);
		const onlineStartIndex = responseHtml.indexOf(onlineStart, baseIndex);
		const onlineEndIndex = responseHtml.indexOf(
			onlineEnd,
			onlineStartIndex + onlineStart.length
		);
		const rateCountStartIndex = responseHtml.indexOf(rateCountStart, baseIndex);
		const rateCountEndIndex = responseHtml.indexOf(
			rateCountEnd,
			rateCountStartIndex + rateCountStart.length
		);
		const rateScoreStartIndex = responseHtml.indexOf(rateScoreStart, baseIndex);
		const rateScoreEndIndex = responseHtml.indexOf(
			rateScoreEnd,
			rateScoreStartIndex + rateScoreStart.length
		);
		IndicesList.push({
			username: [usernameStartIndex + usernameStart.length, usernameEndIndex],
			userId: [userIdStartIndex + userIdStart.length, userIdEndIndex],
			country: [countryStartIndex + countryStart.length, countryEndIndex],
			avatar: [avatarStartIndex + avatarStart.length, avatarEndIndex],
			online: [onlineStartIndex + onlineStart.length, onlineEndIndex],
			rateCount: [
				rateCountStartIndex + rateCountStart.length,
				rateCountEndIndex,
			],
			rateScore: [
				rateScoreStartIndex + rateScoreStart.length,
				rateScoreEndIndex,
			],
		});

		// next step
		usernameStartIndex = responseHtml.indexOf(
			usernameStart,
			usernameStartIndex + 1
		);
	}

	const userList = [];
	// const userSet = $("div.seller-info div.seller-name > a", htmlBody);
	for (const item of IndicesList) {
		const username = responseHtml.slice(item.username[0], item.username[1]);
		const userId = parseInt(responseHtml.slice(item.userId[0], item.userId[1]));
		const country = responseHtml.slice(item.country[0], item.country[1]);
		const avatar = responseHtml.slice(item.avatar[0], item.avatar[1]);
		const online = responseHtml.slice(item.online[0], item.online[1]);
		const rateCount = parseInt(
			responseHtml.slice(item.rateCount[0], item.rateCount[1])
		);
		const rateScore = parseFloat(
			responseHtml.slice(item.rateScore[0], item.rateScore[1]).slice(0, 3)
		);

		userList.push({
			category: category,
			username: username,
			user_id: userId,
			country: country,
			avatar: avatar,
			online: online,
			rate_count: rateCount,
			rate_score: rateScore,
		});
	}

	return userList;
}

async function fetchUserInfo(url) {
	setStatusText(`Fetching ${url}`);
	const response = await axios.get(url);
	await sleep(getRandomInterval());
	setStatusText("...");

	const htmlBody = $(response.data);
	const location = $("ul.user-stats > li.location > b", htmlBody).html();
	const memberSince = $("ul.user-stats > li.member-since > b", htmlBody)
		.html()
		.replace(/[<!-->]/g, "")
		.replace(/ +/g, " ");
	const userDate = moment(memberSince, "MMM YYYY").format("YYYY_MM");
	const responseTime = $(
		"ul.user-stats > li.response-time > b",
		htmlBody
	).html();
	const userRate = $(
		"div.user-profile-info div.ratings-wrapper > span",
		htmlBody
	);
	const rateScore = userRate.attr("data-user-rating");
	const rateCount = userRate.attr("data-user-ratings-count");
	const userInfo = {
		country: location,
		member_since: userDate,
		response_time: responseTime,
		rate_score: rateScore,
		rate_count: rateCount,
	};

	return userInfo;
}

const exportTableToJson = (db, type) => {
	return new Promise((resolve, reject) => {
		const tables = db.tables.map((item) => item.name);

		if (tables.length === 0 || !tables.includes(type)) {
			resolve(JSON.stringify({}));
		} else {
			db.table(type)
				.toArray()
				.then((result) => {
					const jsonTable = { [`${type}`]: result };
					resolve(JSON.stringify(jsonTable, null, 2));
				})
				.catch((error) => {
					reject(error);
				});
		}
	});
};

const exportMainToJson = (db, count) => {
	return new Promise((resolve, reject) => {
		const tables = db.tables.map((item) => item.name);

		if (tables.length === 0 || !tables.includes(ExportTypes.Users)) {
			resolve(JSON.stringify({}));
		} else {
			db.table(ExportTypes.Users)
				.orderBy("userId")
				.reverse()
				.limit(count)
				.toArray()
				.then((result) => {
					const jsonTable = { [`${ExportTypes.Main}`]: result };
					resolve(JSON.stringify(jsonTable, null, 2));
				})
				.catch((error) => {
					reject(error);
				});
		}
	});
};

const importFromJson = (db, json) => {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(db.objectStoreNames, "readwrite");
		transaction.addEventListener("error", reject);

		var importObject = JSON.parse(json);
		for (const storeName of db.objectStoreNames) {
			let count = 0;
			for (const toAdd of importObject[storeName]) {
				const request = transaction.objectStore(storeName).add(toAdd);
				request.addEventListener("success", () => {
					count++;
					if (count === importObject[storeName].length) {
						// Added all objects for this store
						delete importObject[storeName];
						if (Object.keys(importObject).length === 0) {
							// Added all object stores
							resolve();
						}
					}
				});
			}
		}
	});
};

(function (console) {
	console.save = function (data, filename) {
		if (!data) {
			console.error("Console.save: No data");
			return;
		}

		if (!filename) filename = "console.json";

		if (typeof data === "object") {
			data = JSON.stringify(data, null, 2);
		}

		var blob = new Blob([data], { type: "text/json" }),
			e = document.createEvent("MouseEvents"),
			a = document.createElement("a");

		a.download = filename;
		a.href = window.URL.createObjectURL(blob);
		a.dataset.downloadurl = ["text/json", a.download, a.href].join(":");
		e.initMouseEvent(
			"click",
			true,
			false,
			window,
			0,
			0,
			0,
			0,
			0,
			false,
			false,
			false,
			false,
			0,
			null
		);
		a.dispatchEvent(e);
	};
})(console);

function showLoading() {
	const loading = document.querySelector(".loading");
	loading.style.display = "block";
}

function hideLoading() {
	const loading = document.querySelector(".loading");
	loading.style.display = "none";
}

function setStatusText(text) {
	$("#current-status").html(text);
	highlightBackground("#current-status");
}

function setStatusCategory(text) {
	$("#current-category").html(text);
	highlightBackground("#current-category");
}

function setStatusProgress(text) {
	$("#current-progress").html(text);
	highlightBackground("#current-progress");
}

function highlightBackground(element) {
	$(element).css("background-color", "lightgreen");
	setTimeout(() => {
		$(element).css("background-color", "white");
	}, 300);
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomInterval() {
	const interval = APIInterval + Math.floor(Math.random() * APIInterval);
	return interval;
}

export {
	clearOnlineUsersTable,
	createDB,
	exportMain,
	exportTable,
	getCategoryList,
	getRandomInterval,
	hideLoading,
	refreshCategoryList,
	setStatusCategory,
	setStatusProgress,
	setStatusText,
	showLoading,
	sleep,
	updateUsersByCategory,
	clearAll,
};
