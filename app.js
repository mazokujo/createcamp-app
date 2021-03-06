if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
// require express session and connect-flash
const session = require('express-session');
const flash = require('connect-flash');
//ejs-mate (to improve html template)
const ejsMate = require('ejs-mate');
//require method override for put, push, delete route
const methodOverride = require('method-override');
//require passport
const passport = require('passport')
//require passport-local
const localStrategy = require('passport-local')
//require multer
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
//require mongoose express sanitise
const mongoSanitize = require('express-mongo-sanitize');
//require helmet
const helmet = require("helmet");
//require connect-mongo
const MongoDBStore = require('connect-mongo');
//require UserSchema
const User = require('./models/user')
//require new class for error handling: appError
const AppError = require('./Errorhandling utilities/appError');
// require Campground routes
const campgroundRoutes = require('./router/campground');
//require Review routes
const reviewRoutes = require('./router/review');
//require User routes
const userRoutes = require('./router/user');
//mongoose connection, our database is yelpcamp

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelpcamp'
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    //remove mongoose deprecation error 
    useFindAndModify: false
});

// handling error in mongoose connection
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    // we're connected!
    console.log("Database connected")
});
//use method override
app.use(methodOverride('_method'));

// setting ejs in view engine
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

// we need to parse req.body to make a post request
app.use(express.urlencoded({ extended: true }));
//middleware to enable static files in our boilerplate
app.use(express.static(path.join(__dirname, 'public')));

//create new mongostore which change default storage of session from browser to mongo

const secret = process.env.SECRET || 'mysecret'
const store = new MongoDBStore({
    mongoUrl: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
})

store.on('error', function (e) {
    console.log("SESSION STORE ERROR", e)
})

// setting express-session and flash
const sessionParam = {
    store,
    name: 'kreativeK',
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        //secure:true,
        //specifies the life of a cookie, in our case 1 week
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionParam));
app.use(flash());
//execute passport,localStrategy
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

//serialise user and deserialise user(associaciate or disassociate the user to the session or log him out of the session)
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
//execute mongoose-express sanitise
app.use(mongoSanitize());
//execute helmet
app.use(helmet());
//provides specification for Content Security Policy middleware from helmet
const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://api.tiles.mapbox.com/",
    "https://api.mapbox.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net",
];
//This is the array that needs added to
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
    "https://cdn.jsdelivr.net",
];
const connectSrcUrls = [
    "https://api.mapbox.com/",
    "https://a.tiles.mapbox.com/",
    "https://b.tiles.mapbox.com/",
    "https://events.mapbox.com/",
];
const fontSrcUrls = [];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/dcsoakvpl/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com/",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);


//flash message middleware can be access in every single request
//we can also add req.user object, it will be accessed in every single request
app.use((req, res, next) => {
    console.log(req.query)
    console.log(req.session);
    if (!['/login', '/'].includes(req.originalUrl)) {
        req.session.returnTo = req.originalUrl
    }
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currentUser = req.user
    next()
})

//ROUTES


// All campground routes
app.use('/campground', campgroundRoutes);
//All review routes
app.use('/campground/:id/review', reviewRoutes);
//All user routes
app.use('', userRoutes);

//home
app.get('/', (req, res) => {
    res.render('home')
});
// // handling all remaining error
// app.all('*', (req, res, next) => {
//     next(new AppError('Page Not Found', 404))
// })

// error handling middleware with custom message notificattion
app.use((err, req, res, next) => {
    const { status = 500 } = err;
    if (!err.message) err.message = 'Something went wrong'
    console.log(err)
    // change stack message
    res.status(status).render('error', { err });
});
const port = process.env.PORT || 8080
app.listen(port, () => {
    console.log(`Receiving from port ${port}`);
});


