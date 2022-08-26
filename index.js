require('dotenv').config();
const express = require('express');
const app = express()
const auth = express.Router()
const bcrypt = require('bcryptjs');
const { connect } = require('http2');
const path = require('path');
const { errors, queryResult } = require('pg-promise');
const { isNull } = require('util');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { randomInt } = require('crypto');
var usersession
const pgp = require('pg-promise')();
const db = pgp({
  connectionString: process.env.DATABASE_URL/*,
  ssl: { rejectUnauthorized: false }*/
});
const PORT = process.env.PORT || 5000
const saltRounds = 10;


// DATABASE CONFIG
db.query("CREATE TABLE IF NOT EXISTS users ( \
  Username varchar(50) NOT NULL UNIQUE PRIMARY KEY, \
  Password varchar(60) NOT NULL, \
  Name varchar(20), \
  Age SMALLINT, \
  School varchar(30), \
  Interest TEXT[]);"
);
// DEVELOPERS SHOULD ADD CODE HERE



// DEVELOPERS CODE ENDS HERE
app.use(express.static(path.join(__dirname, 'public')))
  .use(express.urlencoded())
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .use(session({
    name: "session-id",
    secret: "GFGEnter", // Secret key,
    saveUninitialized: true,
    resave: false,
  }))
  .use(cookieParser())  
  // ROUTING EXAMPLES
  .get('/', (req, res) => res.redirect('/auth/login'))
  .get('/profile', (req, res) => res.render('pages/profile', { title: 'Edit Profile' }))
  .get('/home', async (req, res) => {
    var users = await db.query(`SELECT * FROM users`, (users) => {return users})
    var randomUser = users[randomInt(users.length)]
    res.render('pages/home', { title: 'Home' , displayUser: randomUser})
  })
  .get('/home/next', async (req, res) => {
    var users = await db.query(`SELECT * FROM users`, (users) => {return users})
    var randomUser = users[randomInt(users.length)]
    res.render('pages/home', { title: 'Home' , displayUser: randomUser})
  })
  .get('/messages', (req, res) => res.render('pages/messages', { title: 'Messages' }))
  // ROUTING STARTS HERE
  .post('/profile', async (req, res) => {

    
    console.log(req.body)



    db.none(`UPDATE users SET Name='${req.body.name}', Age=${req.body.age}, School='${req.body.school}', Interest=ARRAY[${req.body.interest}] WHERE Username='${req.session.userid}'`)

    res.redirect("/profile");
    
  })


  // ROUTING ENDS HERE
  .use('/auth', auth)
  .listen(PORT, () => console.log(`Listening on ${PORT}`))

// AUTH FUNCTIONS
// Authentication Router
// Handles HTTP requests that go to https://localhost:PORT/auth

// Login User function
// Input Values: 
//    username: string
//    password: string
// Return Values:
//    null: if matching user does not exist
//    object: returns the correct user
async function loginUser(username, password) {
  return bcrypt.hash('1', saltRounds).then(async (fakeHash) => {
    return db.one(`SELECT Username, Password FROM users WHERE Username='${username}'`).then(async (user) => {
      return bcrypt.compare(password, user.password).then(async (loggedIn) => {
        if (loggedIn) { return user } else { return null }
      })
    }).catch(async error => {
      console.log(error.message || error)
      return await bcrypt.compare('2', fakeHash).then(async () => { return null })
    })
  })
}

// Login page methods
auth.get('/login', (req, res) => res.render('pages/auth/login', { title: 'Login' }))

auth.post('/login', async (req, res) => {
  await loginUser(req.body.username, req.body.password).then((user) => {
    if (user) {
      
      usersession = req.session
      usersession.userid=req.body.username;
      res.redirect('/home')

      //db.one(`UPDATE users SET ID = ${req.session.id} WHERE Username = ${req.body.username}`)
    } else {
      res.send("The username and password provided do not match our records.")
    }
  })
  
})

// Register User function
// Return Values: 
//    Bool: True if user successfully registered, false if not!
async function registerUser(username, password) {
  return db.none(`SELECT * FROM users WHERE Username='${username}'`).then(async () => {
    return bcrypt.hash(password, saltRounds).then(async (hashedPass) => {
      return db.query(`INSERT INTO users VALUES ('${username}', '${hashedPass}')`).then(async () => { return true })
    })
  }).catch(error => {
    console.log(error.message || error)
    return false
  })
}

// Register page methods
auth.get('/signup', (req, res) => res.render('pages/auth/signup', { title: 'Sign Up' }))
auth.post('/signup', async (req, res) => {
  if (await registerUser(req.body.username, req.body.password)) {
    res.send(`User "${req.body.username}" has been created.`)
  } else {
    res.send(`User "${req.body.username}" already exists.`)
  }
});

