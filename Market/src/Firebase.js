const firebaseConfig = {
	apiKey: "AIzaSyB685pk8BLbZ4O3nBu0yFsf_L30hYmTft8",
	authDomain: "lootdogmarket.firebaseapp.com",
	databaseURL: "https://lootdogmarket-default-rtdb.firebaseio.com",
	projectId: "lootdogmarket",
	storageBucket: "lootdogmarket.appspot.com",
	messagingSenderId: "597456895439",
	appId: "1:597456895439:web:85057b816e1de2376966ba"
};

firebase.initializeApp(firebaseConfig);

const firestore = firebase.firestore();
