
var spinnerLoaderForMenu = document.getElementById("theSpinnerLoaderForMenu");
var spinnerLoader = document.getElementById("theSpinnerLoader");
let bookListHtmlItem = document.getElementById("book-list");
let videoPlayerBoyHtml = document.getElementById("video_player_box");
var myVideoHtml = document.getElementById("my-video");
var isCurrentBookFree = true;
var src = "";
var started = new Date();
var ssoOverride = {
    prod : "https://api.v2.bookrclass.com/api/",
    staging : "https://api.staging2.v2.bookrclass.com/api/",
    "vcloud-mock": "https://bookr-sso-mock-creatit-server.herokuapp.com/api/"
}
var currentBooksNumOfPages = 0;
var currentChildId = null;
var currentSubscription = null;
var hasSchoolSubscription = null;
var schoolSubscriptionExpirationTime = null;

var ssoUsersAccessToken = null;
var ssoBasePath = null;

var currentVideoSeekerPosition = 0;

function openLoginAndCloseIFrame() {
	window.top.postMessage("InternalCmd_BKR_WebGL_Book_Player_Open_Login_and_Close", '*');
}

function openShopAndCloseIFrame() {
	window.top.postMessage("InternalCmd_BKR_WebGL_Book_Player_Open_Shop_and_Close", '*');
}

function closeIFrame() {
	window.top.postMessage("InternalCmd_BKR_WebGL_Book_Player_Close_Me_Now", '*');
}

function myStartHandler(e) {
    console.log("play event was called");
    started = new Date();
    if (!isCurrentBookFree) {
        console.log("Book is not free!");
        myVideoHtml.pause();
        //alert("This book is not free!");
		$('#bookNotFreeModal').modal('show');
		
		if (currentChildId) {
			document.getElementById("btn-webgl-signin").style.display = "none";
		}
		else {
			document.getElementById("btn-webgl-signin").style.display = "block";
		}
		
		$('.modal-body').html('<img src="./rabbit.png" /><br /><br /><strong style="font-size: 24px">Subscribe to see this book!</strong>');
        /*var href = window.location.href;
        window.location.href = href.split('?')[0];*/
    }
}
function myEndHandler(e) {
    var ended = new Date();
    var distance = (ended.getTime() - started.getTime()) / 1000;
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
	
	let allPagesVisited = [...Array(currentBooksNumOfPages).keys()];
	let lastPageIndex = currentBooksNumOfPages - 1;
	
    var result = {
        bookId: params.book,
        userId: currentChildId,
        startedAt: started,
        duration: distance,
        pagesVisited: allPagesVisited,
        lastPageVisited: lastPageIndex,
    };
    var resultJson = JSON.stringify(result)
    console.log(resultJson)
    window.top.postMessage(resultJson, '*');
	sendBookReadingDataToBackend(resultJson, params);
}

function myPauseHandler(e) {
	var ended = new Date();
    var distance = (ended.getTime() - started.getTime()) / 1000;
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
	
	let allPagesVisited = [...Array(currentBooksNumOfPages).keys()];
	let lastPageIndex = currentBooksNumOfPages - 1;
	
	let currPagesVisited = currentVideoSeekerPosition > 80 ? allPagesVisited : [0];
	
    var result = {
        bookId: params.book,
        userId: currentChildId,
        startedAt: started,
        duration: distance,
        pagesVisited: currPagesVisited,
        lastPageVisited: lastPageIndex,
    };
    var resultJson = JSON.stringify(result)
    console.log(resultJson)
    window.top.postMessage(resultJson, '*');
	sendBookReadingDataToBackend(result, params);
}

function sendBookReadingDataToBackend(result, params) {
	
	let res = {
		startedAt: result.startedAt,
		duration: result.duration,
		pagesVisited: result.pagesVisited,
		lastPageVisited: result.lastPageVisited,
		bookId: result.bookId
	}
	
	let toSend = {
		results: [
			res
		]
	}
	
	var resultJson = JSON.stringify(toSend);
	
	if (currentChildId != undefined && currentChildId != null && (params.accessToken || (params.ssoId && params.token))) {
		
		console.log("Book Reading Data sent to server : " + resultJson);
		
		if (!params.accessToken && !ssoBasePath)
			return;
		
		let bookReadingDataEndpoint = "https://api.v2.bookrclass.com/api/mobile/child/" + currentChildId + "/readBook";
		
		let bookReadingDataEndpointPrefix = "mobile/child/";
		let bookReadingDataEndpointSufix = "/readBook";
		
		let bReadingEndpointEnding = bookReadingDataEndpointPrefix + currentChildId + bookReadingDataEndpointSufix;
		let ssoReadingEndpoint = ssoBasePath + bReadingEndpointEnding;
		
		let fullCurrentReadingEndpoint = params.accessToken ? bookReadingDataEndpoint : ssoReadingEndpoint;
		
		let authToken = params.accessToken ? params.accessToken : ssoUsersAccessToken;
	
		fetch(fullCurrentReadingEndpoint, {
			method: 'POST',
			headers: new Headers({
                    'Authorization': 'Bearer '+ authToken, 
                    'Content-Type': 'application/json'
                }),
			body: resultJson})
			.then(response => response.json())
			.then(data => {
				console.log("Child's Reading Data successfully sent to server!");
				console.log("Server response : " + data);
			})
			.catch((error) => {
				console.error('Error:', error);
			});
	}
}

function pauseBook() {
	if (isVideoPlayerNeeded()) {
		myVideoHtml.pause();
	} else {
		window.unityInstance.SendMessage('JavaScriptHook', 'PauseBook');
	}
}

function startBook() {
	if (isVideoPlayerNeeded()) {
		myVideoHtml.play();
	} else {
		window.unityInstance.SendMessage('JavaScriptHook', 'StartBook');
	}
}


function toggleStartPause() {
	if (isVideoPlayerNeeded()) {
		if (myVideoHtml.paused == true) {
			myVideoHtml.play();
		} else {
			myVideoHtml.pause();
		}
	} else {
		window.unityInstance.SendMessage('JavaScriptHook', 'TogglePauseBook');
	}
}

window.addEventListener('message', event => {
    if (event.data === "toggleStartPause")
        toggleStartPause();
    else if (event.data === "startBook")
        startBook();
    else if (event.data === "pauseBook")
        pauseBook();
});

function myMoreThanEigthyPercentReachedHandler(seekerPercent) {
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
	
	let allPagesVisited = [...Array(currentBooksNumOfPages).keys()];
	let lastPageIndex = currentBooksNumOfPages - 1;
	
    var result = {
        bookId: params.book,
        userId: currentChildId,
        startedAt: started,
        duration: seekerPercent,
        pagesVisited: allPagesVisited,
        lastPageVisited: lastPageIndex,
    };
    var resultJson = JSON.stringify(result)
    console.log(resultJson)
    window.top.postMessage(resultJson, '*');
	sendBookReadingDataToBackend(result, params);
}

function LoadingMenu(isLoading)
{
    spinnerLoaderForMenu.style.display = isLoading ?  "block" : "none";
    return 
}

function Loading(isLoading)
{
    spinnerLoader.style.display = isLoading ?  "block" : "none";
    return 
}

function BookDataRecived(jsonData, isAllowedToSeePaidBooks)
{
	console.log("isAllowedToSeePaidBooks : " + isAllowedToSeePaidBooks);	
    isCurrentBookFree = isAllowedToSeePaidBooks;
    console.log("books data arrived");
    LoadingMenu(false);
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
    var bookId = params.book;
    if (!bookId)
        bookId = params.bookId;
    //var src = "";
    var posterImg = "https://api.v2.bookrclass.com/api/media/Ym9vay1jb3Zlci93LzMvdzNsa3p5ZzFZYW1pQjlxVXJMYU1vSFZseDU1UXJUeGhVT1VvbkVQWUs0LmpwZw==/original_4k.jpg";

    var accessTokenQuery="";
    if (params.accessToken)
        accessTokenQuery = "&accessToken="+params.accessToken;
    for (var id in jsonData.result.list) {
        var book = jsonData.result.list[id];
		
		currentBooksNumOfPages = book.numberOfPages;

        const li = document.createElement('li');
        li.innerHTML = `<h3><a href="?book=`+book.id+ accessTokenQuery+ `">`+book.title+`</a></h3>`;
        if (bookListHtmlItem) bookListHtmlItem.appendChild(li);

        if (book.id == bookId) {
            if (book.previewUrls)
            {
                src = book.previewUrls.original;
            } else {
                alert("This video is unavailable on mobile");
            }
            
            posterImg = book.coverUrls.optimal;
            isCurrentBookFree = isCurrentBookFree || book.isFree;
            console.log("isCurrentBookFree : " + isCurrentBookFree);
        }
    }
    
    if (bookId){
        videoPlayerBoyHtml.hidden = false;
		videoPlayerBoyHtml.style.display = "block";
        bookListHtmlItem.remove();
    } else {
        bookListHtmlItem.hidden = false;
        videoPlayerBoyHtml.remove();
    }

    var myVideoSrc = document.getElementById("videosrc");
    if (myVideoSrc) myVideoSrc.src = src;
    if (myVideoHtml) {
        console.log("myVideoHtml is loading");
        myVideoHtml.addEventListener('ended',myEndHandler);
        myVideoHtml.addEventListener('pause',myPauseHandler);
        myVideoHtml.addEventListener('play',myStartHandler);
		myVideoHtml.addEventListener('timeupdate', () => {
		  let seekerPercent = myVideoHtml.currentTime / myVideoHtml.duration * 100;
		  
		  currentVideoSeekerPosition = seekerPercent;
		  
		  //if (seekerPercent > 80) {
	      //  myMoreThanEigthyPercentReachedHandler(seekerPercent);
		  //}
		});
		
        /*myVideoHtml.addEventListener("click", function(event) { 
            console.log("isPlaying" + myVideoHtml.paused );
            console.log("onClick");
            if (myVideoHtml.paused == true) {
                myVideoHtml.play();
            }
            else {
                myVideoHtml.pause();
            }
        });*/
        myVideoHtml.setAttribute("poster",posterImg);
        myVideoHtml.load();
        console.log("myVideoHtml is loaded");
    }
}

function LoadMobile()
{
	bookListHtmlItem.hidden = true;
    videoPlayerBoyHtml.hidden = true;
    myVideoHtml.pause();
	
	const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });

	var bookId = params.book;
    if (!bookId)
        bookId = params.bookId;

	// production:
	let bookDataUrl = bookId ? "https://api.v2.bookrclass.com/api/mobile/books?filters[id][]=" + bookId : "https://api.v2.bookrclass.com/api/mobile/books";
	
	// staging:
	//let bookDataUrl = bookId ? "https://api.staging.v2.bookrclass.com/api/mobile/books?filters[id][]=" + bookId : "https://api.staging.v2.bookrclass.com/api/mobile/books";
	
    LoadingMenu(true);
    console.log("started loading mobile");
    //fetch("./StreamingAssets/books/booklist.json")
    //fetch("https://bookrlab.com/webvideo/booksList.php")
    //fetch("https://api.v2.bookrclass.com/api/mobile/books")
    fetch(bookDataUrl)
    .then(response => {
        console.log("Books recived");
        return response.json();
    })
    .then(jsonData =>  {		  
        /*const params = new Proxy(new URLSearchParams(window.location.search), {
            get: (searchParams, prop) => searchParams.get(prop),
        });*/
        if (params.accessToken)
        {
            console.log("accessToken login started");
            fetch('https://api.v2.bookrclass.com/api/mobile/users/me', { 
                method: 'get', 
                headers: new Headers({
                    'Authorization': 'Bearer '+ params.accessToken, 
                    'Content-Type': 'application/json'
                })
            }).then(response => {
                //BookDataRecived(jsonData, response.ok);
				return response.json();
            }).then(data => {
				// console.log(data);
				// console.log("user id is : " + data.result.id);
				currentChildId = params.activeUserId ?? data.result.id;
				currentSubscription = data.result.subscription;
				hasSchoolSubscription = data.result.hasSchoolSubscription;
				schoolSubscriptionExpirationTime = data.result.schoolSubscriptionExpirationTime;
				// console.log("data is :" + JSON.stringify(data));
				let isAllowedToSeePaidBooks = currentChildId && ((currentSubscription && currentSubscription.expirationTime && new Date(currentSubscription.expirationTime) > new Date()) || (hasSchoolSubscription && schoolSubscriptionExpirationTime && new Date(schoolSubscriptionExpirationTime) > new Date()));
				BookDataRecived(jsonData, isAllowedToSeePaidBooks);
			}).catch((error) => {
                console.error('Error:', error);
                BookDataRecived(jsonData, false);
            });
        } else if (params.ssoId && params.token) {
            //Login with deeplink provided token
            console.log("ssoid login started");
            var body = { "token": params.token, "sso_id": params.ssoId, "client_id" : 2, "client_secret" : "BookrAWOauthClientDummySecret4Mobile0000"};
            var path =  "oauth/token/sso";
            if (ssoOverride[params.ssoId])
                path = ssoOverride[params.ssoId] + path;
            else
                path = ssoOverride.prod + path;
			ssoBasePath = path.replace("oauth/token/sso", "");
            fetch(path, {method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },})
            .then(response => {
                BookDataRecived(jsonData, response.ok);
				return response.json();
            })
			.then(data => {
				console.log(data);
				console.log("user id is : " + data.user.id);
				currentChildId = params.activeUserId ?? data.user.id;
				ssoUsersAccessToken = data.access_token;
			}).catch((error) => {
                console.error('Error:', error);
                BookDataRecived(jsonData, false);
            });
        } else {
            console.log("no login parameter is found");
            //BookDataRecived({result: {list: [0]}}, false);
			BookDataRecived(jsonData, false);
        }
    }).catch((error) => {
        console.error('Error:', error);
        BookDataRecived(jsonData, false);
    });

    //bookListHtmlItem.hidden = true;
    //videoPlayerBoyHtml.hidden = true;
    //myVideoHtml.pause();
    /* Custom Progressbar - Don't delete it, maybe it can be useful later
    document.getElementById("my-video").addEventListener("timeupdate", function() {
    // if the video is loaded and duration is known
    if(!isNaN(this.duration)) {
            var percent_complete = Math.round((this.currentTime / this.duration) * 100);
            // use percent_complete to draw a progress bar
            document.getElementById("progress").value = percent_complete;
        }
    });
    */
}

window.onblur = (event) => { pauseBook(); };
