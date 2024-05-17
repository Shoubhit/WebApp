const path = require("path");
const express = require("express");
const { table } = require("console");
const bodyParser = require("body-parser");
const { request } = require("https");
const app = express();
app.use(bodyParser.urlencoded({extended:false}));
app.set("views", path.resolve(__dirname, "templates"));
require("dotenv").config({ path: path.resolve(__dirname, '.env') }) 
app.set("view engine", "ejs");
app.use(express.static(__dirname + '/public'));
const uri = `mongodb+srv://sbabu12:${process.env.MONGO_DB_PASSWORD}@cluster0.rbl98d9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
const { MongoClient, ServerApiVersion } = require('mongodb');
const { render } = require("ejs");
process.stdin.setEncoding("utf8");
const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection:process.env.MONGO_COLLECTION};
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const db = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection);

if (process.argv.length != 3) {
    process.stdout.write(`Usage GeolocationServer.js portnumber`);
    process.exit(1);
}
const portNumber = process.argv[2];
console.log(`Web Server started and running at http://localhost:${portNumber}\n`);

process.stdin.on("readable", function () {
    const dataInput = process.stdin.read();
    if (dataInput !== null) {
      const command = dataInput.trim();
      if (command === "stop") {
        process.stdout.write("Shutting down the server\n");
        process.exit(0);
      }else{
          process.stdout.write("Invalid command: "+dataInput)
      }
      process.stdout.write(prompt);
      process.stdin.resume();
    }
  });

async function getAllEnemies(client){
    try{
        await client.connect();
        let result = await db.find({}).toArray()
        return result
    }catch (e){
        console.error(e)
    }finally{
        await client.close()
    }
}

async function getOneEnemy(client,name){
    try{
        await client.connect();
        let result = await db.findOne({name:name})
        return result
    }catch (e){
        console.error(e)
    }finally{
        await client.close()
    }
    
}
function imbedMapURL(lat, lon){
    let result = `<a href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}">MAP</a>` 
    return result
}
function getMapURL(lat, lon){
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
}

async function getData(ip){
    let response = await fetch(`http://ip-api.com/json/${ip}`)
    let json = await response.json()

    return json
}
async function addDataToDB(client,info){
    try{
        await client.connect();
        const result = await db.insertOne(info);
    }catch(e){
        console.error(e)
    }finally{
        await client.close()
    }
}

async function removeAll(client){
    try{
        await client.connect();
        let result = await db.deleteMany({})
    }catch(e){
        console.error(e)
    }finally{
        await client.close()
    }
}

app.get("/", (request, response) => { 
    response.render("index")
})
app.get("/findIP", (request, response) => { 
    response.render("findIP")
})
app.get("/listLocations", async (request, response) => { 
    let enemies = await getAllEnemies(client)
    if(enemies.length === 0){
        response.render("noData")
    }else{
        let rows = ""
        enemies.forEach(e => {
            rows+="<tr><td>"+e.name+"</td>"+"<td>"+e.ip+"</td>"
            +"<td>"+`<img src="https://flagsapi.com/${e.country}/flat/64.png">`+"</td>"+"<td>"+e.city+"</td>"+"<td>"
            +`(${e.lat},${e.lon})->${imbedMapURL(e.lat, e.lon)}`+"</td></tr>"
            
        });
        response.render("listIPs", {data:rows})
    }
})

app.get("/openMap", (request, response) => { 
    response.render("getMap")
})

app.get("/cleared",async (request, response)=>{
    await removeAll(client)
    response.render("cleared")
})



app.post("/showData",async(request, response)=>{
    let json = await getData(request.body.ip)
    if (json.status === "fail"){
        response.render("failure", {message:json.message})
    }else{
        const variables = {
            name:request.body.name,
            ip:request.body.ip,
            country: json.countryCode,
            city:json.city,
            lat: json.lat,
            lon: json.lon,
            map: imbedMapURL(json.lat, json.lon)
        }
        const dbEntry = {
            name:request.body.name,
            ip:request.body.ip,
            country: json.countryCode,
            city:json.city,
            lat: json.lat,
            lon: json.lon,
        }
        await addDataToDB(client,dbEntry)
    
        response.render("IPfound",variables)
    }

})

app.post("/showMap",async (request,response)=>{
    let enemy = await getOneEnemy(client, request.body.name)
    if (enemy == null){
        response.status(200).render("itemNotFound")
    }else{
        let url = await getMapURL(enemy.lat,enemy.lon)
        response.redirect(url)
    }
})

app.listen(portNumber)

