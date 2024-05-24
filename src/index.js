import axios from "axios";
import $ from "jquery";
import {
	createDB,
	exportTable,
	exportMain,
	refreshCategoryList,
	clearAll,
	clearOnlineUsersTable,
	getCategoryList,
	getRandomInterval,
	updateUsersByCategory,
	showLoading,
	hideLoading,
	setStatusText,
	setStatusCategory,
	setStatusProgress,
	sleep,
} from "./utils";
import {
	FiverrDB,
	CategoryUrl,
	ExportTypes,
	APIInterval,
	ExportUnit,
} from "./const";

hideLoading();
createDB();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {});

// Refresh catetory
$("#refresh-category").on("click", (event) => {
	event.preventDefault();

	setStatusText("Clearing all tables");
	clearAll(FiverrDB);
	setStatusText("...");
	refreshCategory();
});

// Export category
$("#export-category").on("click", (event) => {
	event.preventDefault();

	exportTable(FiverrDB, ExportTypes.Category);
});

// Update users
$("#update-users").on("click", (event) => {
	event.preventDefault();

	updateUsers();
});

// Export users
$("#export-users").on("click", (event) => {
	event.preventDefault();

	const isCheckOnline = $("#online-check").is(":checked");
	if (isCheckOnline) {
		exportTable(FiverrDB, ExportTypes.Online);
	} else {
		exportTable(FiverrDB, ExportTypes.Users);
	}
});

// Refresh main
$("#update-date").on("click", (event) => {
	event.preventDefault();

	// updateDate();
});

// Export date
$("#export-date").on("click", (event) => {
	event.preventDefault();

	exportTable(FiverrDB, ExportTypes.Date);
});

// Export main
$("#export-main").on("click", (event) => {
	event.preventDefault();

	const countInput = $("#count-input").val();
	const countNum = countInput ? parseInt(countInput) : 1;
	const exportCount = countNum * ExportUnit;

	exportMain(FiverrDB, exportCount);
});

// Start contact
$("#start-contact").on("click", (event) => {
	event.preventDefault();
});

async function refreshCategory() {
	showLoading();
	try {
		setStatusText("Fetching categories");
		const response = await axios.get(CategoryUrl);
		await sleep(getRandomInterval());
		setStatusText("...");
		const responseHtml = response.data;
		hideLoading();

		const htmlBody = $(responseHtml);
		const categorySet = $("div.main-content li > a", htmlBody);
		const categoryList = [];
		if (categorySet) {
			categorySet.each(function () {
				const categoryName = $(this).html();
				const url = `https://www.fiverr.com${$(this).attr("href")}`;
				categoryList.push({ name: categoryName, url: url });
			});
		}

		refreshCategoryList(FiverrDB, categoryList);
	} catch (error) {
		hideLoading();
		console.error(error);
	}
}

async function updateUsers() {
	const isCheckCategory = $("#category-check").is(":checked");
	const isCheckOnline = $("#online-check").is(":checked");
	const categoryInput = $("#category-input").val();
	const categoryIndex = categoryInput ? parseInt(categoryInput) : 0;

	showLoading();
	try {
		const categoryList = await getCategoryList(FiverrDB);
		const categoryCount = categoryList.length;
		setStatusProgress("0/0");

		if (isCheckOnline) {
			await clearOnlineUsersTable(FiverrDB);
		}

		for (let i = isCheckCategory ? categoryIndex : 0; i < categoryCount; i++) {
			let curIndex = Math.floor(Math.random() * categoryCount);
			if (isCheckCategory) {
				curIndex = i;
			}

			setStatusCategory(
				`(Cur:${curIndex}/All:${categoryCount}) ${categoryList[curIndex].name}`
			);
			await updateUsersByCategory(categoryList[curIndex], isCheckOnline);
		}

		hideLoading();
	} catch (error) {
		hideLoading();
		// errors.textContent = "We have no data for the country you have requested.";
	}
}
