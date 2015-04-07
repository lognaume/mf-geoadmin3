// KML import test using browserstack

var webdriver = require('browserstack-webdriver');
var assert = require('assert');

var QUERYSTRING_KML = "KML%7C%7Chttp:%2F%2Fopendata.utou.ch%2Furbanproto%2Fgeneva%2Fgeo%2Fkml%2FRoutes.kml";

var runTest = function(cap, driver, target) {
  //We maximize our window to be sure to be in full resolution
  driver.manage().window().maximize();
  // Goto the travis deployed site.
  driver.get(target + '/?lang=de');
  //wait until topics related stuff is loaded. We know this when catalog is there
  driver.findElement(webdriver.By.xpath("//a[contains(text(), 'Grundlagen und Planung')]"));

  // Click on "Werkzeuge"
  driver.findElement(webdriver.By.xpath("//a[@id='toolsHeading']")).click();
  // Click on "KML Import"
  driver.findElement(webdriver.By.xpath("//*[contains(text(), 'KML Import')]")).click();
  // Click on "URL"
  driver.findElement(webdriver.By.xpath("//a[contains(text(), 'URL')]")).click();
  // Write URL of the chosen KML
  driver.findElement(webdriver.By.xpath("//*[@id='import-kml-popup']/div[2]/div/div/div[1]/div/div[2]/form/input[1]")).sendKeys('http://opendata.utou.ch/urbanproto/geneva/geo/kml/Routes.kml');
  // Click on "KML Laden"
  driver.findElement(webdriver.By.xpath("//*[@id='import-kml-popup']/div[2]/div/div/div[2]/button")).click();
  // Check if the KML was correctly parsed 
  driver.findElement(webdriver.By.xpath("//*[contains(text(), 'Parsing erfolgreich')]"));
  // Close popup
  driver.findElement(webdriver.By.xpath("//*[@id='import-kml-popup']/div[1]/div[2]/button[3]")).click();

  // Was the URL in the address bar adapted?
  if(!(cap.browser == "IE" && cap.browser_version == "9.0")) {
    // Check if url is adapted to reflect Bern location
    driver.getCurrentUrl().then(function(url) {
      assert.ok(val.indexOf(QUERYSTRING_KML) > -1);
    });
  }
}

module.exports.runTest = runTest;
