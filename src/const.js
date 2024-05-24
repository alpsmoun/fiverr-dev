const ExportTypes = {
	Category: "category",
	Users: "users",
  Online: "online_users",
	Date: "date",
	Main: "main",
};

const DatabaseName = "Fiverr";  //this is the databasenaem
const FiverrUrl = "https://www.fiverr.com";
const CategoryUrl = "https://www.fiverr.com/categories";
const UsersInitUrlSuffix =
	"?source=sorting_by&ref=seller_level%3Ana&filter=new"; // Filter : New Seller, Sort : Newest Arrivals
const UsersPageUrlSuffix =
	"?source=pagination&ref=seller_level%3Ana&filter=new&page="; // Filter : New Seller, Sort : Newest Arrivals, Page
const OnlineUsersInitUrlSuffix =
	"?source=toggle_filters&ref=seller_level%3Ana%7Cis_seller_online%3Atrue&filter=new"; // Filter : New Seller, Sort : Newest Arrivals, Toggle : Online
const OnlineUsersPageUrlSuffix =
	"?source=pagination&ref=seller_level%3Ana%7Cis_seller_online%3Atrue&filter=new&page="; // Filter : New Seller, Sort : Newest Arrivals, Page, Toggle : Online

const PageUnit = 48;
const MaxPageCount = 20;
const APIInterval = 7777;
const ExportUnit = 1000;

let FiverrDB = null;

export {
	ExportTypes,
	FiverrDB,
	DatabaseName,
	FiverrUrl,
	CategoryUrl,
	UsersInitUrlSuffix,
	UsersPageUrlSuffix,
	OnlineUsersInitUrlSuffix,
	OnlineUsersPageUrlSuffix,
	PageUnit,
	MaxPageCount,
	APIInterval,
	ExportUnit,
};
