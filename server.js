// ----------------------------------------
// This is the entry point of this project.
// ----------------------------------------

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const mongoose = require('mongoose');
const dotEnv = require('dotenv');
const bodyParser = require('body-parser');

// configuring ENVs.
dotEnv.config();

const app = express();

// connecting with mongoDB
mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true
})
    .then(() => console.log('DB connected'))
    .catch(err => console.log('DB connection error: ', err));

// importing routes
const authRoutes = require('./routes/auth');
const userProfileRoutes = require('./routes/user');

// app middleware
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(cors()); // this will allow all origin to make request to our server.
if (process.env.NODE_ENV === "development") {
    app.use(cors({ origin: `http://localhost:3000` })); // this will allow all origin to make request to our server.
}

// routes middleware
app.use("/api", authRoutes);
app.use("/api", userProfileRoutes);

// declaring the port.
const port = process.env.PORT || 8000;

// listening req(s) on port 8000.
app.listen(port, () => {
    console.log(`server is running on port ${port}.`);
});
