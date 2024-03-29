var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
const axios = require('axios');
const cheerio = require('cheerio');
var mysql = require('mysql');


var app = express();

var port = process.env.PORT || 8080;

var _res;

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

app.set("view options", {
  layout: false
});
app.use(express.static('./'));


app.get('/', function (req, res) {
  res.render("index");
});

app.get('/about-me', function (req, res) {
  res.render("about/aboutMe");
});

app.get('/contact-us', function (req, res) {
  res.render("contact/contactUs");
});

app.get('/contact-success', function (req, res) {
  res.render("contact/contactSuccess");
});

app.get("/browser", function (req, res) {
  res.render("browser/browser");
});

app.get("/navigator", function (req, res) {
  res.render("browser/navigator");
});

app.get("/window", function (req, res) {
  res.render("browser/window");
});

app.get("/screen", function (req, res) {
  res.render("browser/screen");
});

app.get("/location", function (req, res) {
  res.render("browser/location");
});

app.get("/geolocation", function (req, res) {
  res.render("browser/geolocation");
});

app.get("/from-file", function (req, res) {
  res.render("search/fromFile");
});

app.get("/google-api", function (req, res) {
  res.render("search/googleApi");
});

app.get("/index-url", function (req, res) {
  res.render("admin/indexer");
});

app.get("/my-search-engine", function (req, res) {
  res.render("search/mySearchEngine");
});

app.post("/my-search-engine", function (req, res) {
  var searchTerm = req.body.searchTerm;
  var caseInsens = req.body.caseInsens;
  var partialMatch = req.body.partialMatch;
  var searchDate = new Date();
  var start = new Date().getTime();
  var filteredResults = [];


  if (caseInsens == "true" && partialMatch == "true") {
    mysqlConnection.query("SELECT * FROM page, word, page_word WHERE page.pageId = page_word.pageId AND word.wordId = page_word.wordId AND Upper(word.wordName) LIKE Upper('%" + searchTerm + "%') ORDER BY freq desc",
      function (err, result) {
        if (err) throw err;
        for (var i = 0; i < result.length; i++) {
          const index = filteredResults.findIndex((e) => e.pageId === result[i].pageId);
          if (index === -1) filteredResults.push(result[i]);
        }

        console.log(filteredResults);
        res.send(filteredResults);
        var end = new Date().getTime();
        var searchTime = ((end - start) / 1000).toFixed(2);
        insertSearchTerm(searchTerm, filteredResults.length, searchDate, searchTime);
      });
  } else if (caseInsens == "true") {
    console.log("both");
    mysqlConnection.query("SELECT * FROM page, word, page_word WHERE page.pageId = page_word.pageId AND word.wordId = page_word.wordId AND Upper(word.wordName) = Upper('" + searchTerm + "') ORDER BY freq desc",
      function (err, result) {
        if (err) throw err;
        for (var i = 0; i < result.length; i++) {
          const index = filteredResults.findIndex((e) => e.pageId === result[i].pageId);
          if (index === -1) filteredResults.push(result[i]);
        }
        console.log(filteredResults);
        res.send(filteredResults);
        var end = new Date().getTime();
        var searchTime = ((end - start) / 1000).toFixed(2);
        insertSearchTerm(searchTerm, filteredResults.length, searchDate, searchTime);
      });
  } else if (partialMatch == "true") {
    mysqlConnection.query("SELECT * FROM page, word, page_word WHERE page.pageId = page_word.pageId AND word.wordId = page_word.wordId AND word.wordName LIKE '%" + searchTerm + "%' ORDER BY freq desc",
      function (err, result) {
        if (err) throw err;
        for (var i = 0; i < result.length; i++) {
          const index = filteredResults.findIndex((e) => e.pageId === result[i].pageId);
          if (index === -1) filteredResults.push(result[i]);
        }
        console.log(filteredResults);
        res.send(filteredResults);
        var end = new Date().getTime();
        var searchTime = ((end - start) / 1000).toFixed(2);
        insertSearchTerm(searchTerm, filteredResults.length, searchDate, searchTime);
      });
  } else {
    // searches DB for search term
    mysqlConnection.query("SELECT * FROM page, word, page_word WHERE page.pageId = page_word.pageId AND word.wordId = page_word.wordId AND word.wordName = '" + searchTerm + "' ORDER BY freq desc",
      function (err, result) {
        if (err) throw err;
        for (var i = 0; i < result.length; i++) {
          const index = filteredResults.findIndex((e) => e.pageId === result[i].pageId);
          if (index === -1) filteredResults.push(result[i]);
        }
        console.log(filteredResults);
        res.send(filteredResults);
        var end = new Date().getTime();
        var searchTime = ((end - start) / 1000).toFixed(2);
        insertSearchTerm(searchTerm, filteredResults.length, searchDate, searchTime);
      });
  }

});

app.get("/history-stats", function (req, res) {
  mysqlConnection.query(
    "SELECT * FROM search;",
    function (err, result) {
      if (err) console.log(err);
      else {
        res.render("admin/history-stats", {
          searchHist: result
        });
      }
    });

});

app.post("/index-url", function (req, res) {
  _res = res;
  var url = req.body.url;
  var links = indexMainURL(url);
});

function insertSearchTerm(term, count, date, time) {
  mysqlConnection.query(
    "INSERT INTO search (terms, count, searchDate, timeToSearch) VALUES (\"" + term + "\", " + count + ", \"" +
    date + "\", \"" + time + "\") ",
    function (err, result) {
      if (err) console.log(err);
      console.log("search term added")

    });
}

var selectPageIDQuery = (url) => {
  return new Promise((resolve,reject)=>{
      mysqlConnection.query("SELECT pageId FROM page WHERE url = '" + url + "';", (err, result) => {
          if (err) {
              reject(err)
          } else {  
              resolve(result)
          }
      })
  })
}


async function getUrlId(linkInfo, words) {
  try {
    const result = await selectPageIDQuery(linkInfo.url);
    console.log(result[0].pageId);
    if (result[0].pageId === undefined) {
      console.log("PAGE ID IS UNDEFINED");
    } else {
      await saveWords(words, result[0].pageId);
    }
  } catch (e) {
    console.log(e);
  }
}

async function saveWords(wordArray, id) {
  var pageId = {};
  var wordMap = {};
  wordId = {};

  wordArray.forEach(element => {
    if (!(element in wordMap)) {
      wordMap[element] = 0;
    }
    wordMap[element] = wordMap[element] + 1;
  });

  /*
  HOW TO CONSTRUCT IF STATEMENTS (pseudo code):

  if word exists in words
    if words.wordID exists in page_word
      update pageword to freq = freq +1
    else 
      insert into page_word  wordID pageId freq =1
  else 
    insert into word, worf
    insert into page_word pageID wordId freq = 1

  */
  var wordSet = new Set(wordArray);
  wordArray = Array.from(wordSet);
  var i = 0;
  for (let i = 0; i < wordArray.length; i++) {
    var element = wordArray[i];
    let clean = (element.replace(/\W/g, '')).substr(0, 254);

    await mysqlConnection.query("CALL putWordIn('" + clean + "', " + wordMap[element] + ", " + id + ")");
    console.log(i + "/" + wordSet.size);
    i++;
  };
}


async function indexMainURL(url) {
  // this function gets all words and all links

  var start = new Date().getTime();

  axios.get(url)
    .then(async response => {
      var $ = cheerio.load(response.data);
      var words = getWords(response.data);
      await getLinks(response.data);
      var end = new Date().getTime();
      var seconds = ((end - start) / 1000).toFixed(2);

      var date;
      date = new Date()
      date = date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2) + ' ' +
        ('00' + date.getUTCHours()).slice(-2) + ':' +
        ('00' + date.getUTCMinutes()).slice(-2) + ':' +
        ('00' + date.getUTCSeconds()).slice(-2);
      // get urls info
      var linkInfo = {
        "title": $("title").text(),
        "url": url,
        "description": $('meta[name="description"]').attr('content'),
        "lastModified": $('meta[name="last-modifed"]').attr('content'), // get last modified (it in headers somewhere)
        "lastIndexed": date,
        // get the data of last time it was indexed
        "timeToIndex": seconds // record the amount of time it took to index
      };

      //TODO fix the datetimes from NOW() to actual datetimes, also need to fix time to index,

      await saveLink(linkInfo);
      await getUrlId(linkInfo, words);
      console.log("************\n\n\n\n\n***************");
      _res.send("DONE");
    })
    .catch(error => {
      console.log(error);
    });
}

async function saveLink(linkInfo) {
  if (linkInfo.description.length > 255)
    linkInfo.description = linkInfo.description.substr(0, 254);
  await mysqlConnection.query(
    "INSERT INTO page (title, url, description, lastModified, lastIndexed, timeToIndex) VALUES (\"" + linkInfo.title + "\", \"" + linkInfo.url + "\", \"" +
    linkInfo.description + "\", NOW(), \"" + linkInfo.lastIndexed + "\", \"" + linkInfo.timeToIndex + "\") ",
    function (err, result) {
      if (err) console.log(err);
      console.log("1 link/page record added")
    })
}

//
function getWords(html) {
  var $ = cheerio.load(html);
  var words = $('body').text().split(/\s+/);
  var filteredWords = words.filter(el => (el.length > 0));
  // console.log(filteredWords);
  return filteredWords;
}

async function getLinks(html) {
  // this function gets links from the url
  var $ = cheerio.load(html);
  var a = $("a");
  var links = [];
  console.log("0000\n\n\n\n\n");

  for (let i = 0; i < a.length; i++) {
    let link = a[i];
    // push the link into the link array and then index that link
    if (validURL($(link).attr('href'))) {
      if (links.length == 5) return false;
      console.log("1111\n\n");
      let res = await indexLink($(link).attr('href'));
      console.log("2222\n\n"); // 2
      links.push(res);
    }
  }
  console.log("3333\n\n\n\n\n"); // 1
  return links;
}

async function indexLink(link) {
  // this function only gets the words from a link
  var start = new Date().getTime();
  var date = new Date();
  await axios.get(link)
    .then(async response => {
      var date;
      date = new Date();
      date = date.getUTCFullYear() + '-' +
        ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
        ('00' + date.getUTCDate()).slice(-2) + ' ' +
        ('00' + date.getUTCHours()).slice(-2) + ':' +
        ('00' + date.getUTCMinutes()).slice(-2) + ':' +
        ('00' + date.getUTCSeconds()).slice(-2);

      var end = new Date().getTime();
      var seconds = ((end - start) / 1000).toFixed(2);
      var $ = cheerio.load(response.data);
      // get words from link
      var words = getWords(response.data)
      // get links info
      var linkInfo = {
        "title": $("title").text(),
        "url": link,
        "description": $('meta[name="description"]').attr('content'),
        "lastModified": $('meta[name="last-modifed"]').attr('content'), // get last modified
        "lastIndexed": date, // get the data of last time it was indexed
        "timeToIndex": seconds // record the amount of time it took to index
      }

      await saveLink(linkInfo);
      await getUrlId(linkInfo, words)

      console.log(linkInfo);
      return linkInfo;
    })
    .catch(error => {
      console.log(error);
    });
}

function validURL(str) {
  var pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
  return !!pattern.test(str);
}


var mysqlConnection = mysql.createConnection({
  host: "149.4.211.180",
  user: "sajo6699",
  password: "23556699",
  database: "sajo6699",
  multipleStatements: true
});

mysqlConnection.connect((err) => {
  if (!err) {
    console.log("Connected to the database!");
  } else {
    console.log("connection to database Failed :(");
  }
});


app.listen(port, function () {
  console.log('Our app is running on http://localhost:' + port);
});