// Print test using browserstack

var webdriver = require('browserstack-webdriver');

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
  // Click on "WMS Import"
  driver.findElement(webdriver.By.xpath("//*[contains(text(), 'WMS Import')]")).click();
  // Click on the URL input field
  driver.findElement(webdriver.By.xpath("//*[@id='import-wms-popup']/div[2]/div/div/div/form/span/input[2]")).click();
  // Write URL of the chosen WMS
  driver.findElement(webdriver.By.xpath("//*[@id='import-wms-popup']/div[2]/div/div/div/form/span/input[2]")).sendKeys('http://wms.geo.admin.ch/');
  // Click on "Verbinden"
  driver.findElement(webdriver.By.xpath("//*[@id='import-wms-popup']/div[2]/div/div/div/form/button")).click();
  // Click on "AGNES"
  driver.findElement(webdriver.By.xpath("//*[@id='import-wms-popup']/div[2]/div/div/div/div[1]/div[2]/ul/li[4]/div/div")).click();
  // Click on "Layer hinzufügen"
  driver.findElement(webdriver.By.xpath("//*[@id='import-wms-popup']/div[2]/div/div/div/div[2]/button")).click();
  // Accept the alert
  driver.switchTo().alert().accept();
  // Check if the WMS was correctly parsed
  driver.findElement(webdriver.By.xpath("//*[contains(text(), 'WMS Layer erfolgreich geladen')]"));
  // Close popup
  driver.findElement(webdriver.By.xpath("//*[@id='import-wms-popup']/div[1]/div[2]/button[3]")).click();
  // Click on "Drucken"
  driver.findElement(webdriver.By.xpath("//a[@id='printHeading']")).click();
  // Wait until print is opened and animation is finished
  driver.findElement(webdriver.By.xpath("//div[@id='print' and contains(@class, 'collapse in')]"));
  // Try Print
  driver.findElement(webdriver.By.xpath("//button[contains(text(), 'Drucken')]")).click();
  // Is it success?
  driver.findElement(webdriver.By.xpath("//span[@ng-if='options.printsuccess']"));
}

module.exports.runTest = runTest;
