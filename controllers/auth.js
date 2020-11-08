const User = require('../models/user');
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const _ = require("lodash");
const fetch = require('node-fetch');
// send grid
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
// google
const { OAuth2Client } = require('google-auth-library');
const { response } = require('express');

exports.signUp = (req, res) => {
    const { name, email, password } = req.body;

    User.findOne({ email }).exec((err, user) => {
        // checking if the user already exists.
        if (user) {
            return res.status(400).json({
                message: 'Email is taken'
            })
        }

        const token = jwt.sign({ name, email, password }, process.env.JWT_ACTIVATION, { expiresIn: '10m' });

        // creating email data.
        const emailData = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Account Activation link',
            html: `
                <h1>Please use the following link to activate your account.</h1>
                <p>${process.env.CLIENT_URL}/auth/account-activation/${token}</p>
                <hr />
                <p>This email contains sensitive information</p>
                <p>${process.env.CLIENT_URL}</p>
            `
        }

        // sending email to the user's email.
        sgMail.send(emailData).then(sent => {
            // console.log(sent);
            return res.json({
                message: `Email has been sent to ${email}. Follow the instructions to activate your account.`
            })
        }).catch(err => {
            return res.json({
                message: err.message
            })
        })
    });
}

exports.accountActivation = (req, res) => {
    const { token } = req.body;
    if (token) {
        jwt.verify(token, process.env.JWT_ACTIVATION, function (err, decodedToken) {
            if (err) {
                return res.status(401).json({
                    err,
                    message: "Expired link. Signup again."
                })
            }

            const { name, email, password } = decodedToken;

            const user = new User({ name, email, password });

            user.save((err, user) => {
                if (err) {
                    console.log('SAVE USER IN ACCOUNT ACTIVATION ERROR', err);
                    return res.status(401).json({
                        message: "Error saving user in database. Try signup again."
                    });
                }

                return res.json({
                    message: "Signup success. please signin."
                })
            })
        });
    } else {
        return res.json({
            message: "Something went wrong. Try again."
        })
    }
}

exports.signIn = (req, res) => {
    const { email, password } = req.body;

    // check if the user exists.
    User.findOne({ email }).exec((err, user) => {
        if (err || !user) {
            return res.status(400).json({
                message: `User with this email doesn't exist. Please signup.`
            });
        }

        // authenticate
        if (!user.authenticate(password)) {
            return res.status(400).json({
                message: `Email and password do not match.`
            });
        }

        // generate a token and send to client.
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const { _id, name, email, role } = user;

        return res.json({
            token,
            user: { _id, name, email, role }
        })
    });
}

exports.requireSignin = expressJwt({
    secret: process.env.JWT_SECRET,
    algorithms: ['sha1', 'RS256', 'HS256'],
});

exports.adminMiddleware = (req, res, next) => {
    const userId = req.user._id;

    User.findById(userId).exec((err, user) => {
        if (err || !user) {
            return res.status(400).json({
                message: "User not found."
            });
        }

        if (user.role !== 'admin') {
            return res.status(400).json({
                message: "Admin resource. Access denied."
            });
        }

        req.profile = user;
        next();
    });
}

exports.forgotPassword = (req, res) => {
    const { email } = req.body;

    User.findOne({ email }, (err, user) => {

        if (err || !user) {
            return res.status(400).json({
                message: `User of this email "${email}" not found.`
            });
        }

        const token = jwt.sign({ _id: user._id }, process.env.JWT_RESET_PASSWORD, { expiresIn: '10m' });

        // creating email data.
        const emailData = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Reset Password Link',
            html: `
                <h1>Please use the following link to reset your password.</h1>
                <p>${process.env.CLIENT_URL}/auth/reset-password/${token}</p>
                <hr />
                <p>This email contains sensitive information</p>
                <p>${process.env.CLIENT_URL}</p>
            `
        };

        return user.updateOne({ resetPasswordLink: token }, (err, success) => {
            if (err) {
                return res.status(400).json({
                    message: "Database connection error on user password forgot request."
                });
            } else {
                // sending email to the user's email.
                sgMail.send(emailData).then(sent => {
                    // console.log(sent);
                    return res.json({
                        message: `Email has been sent to ${email}. Follow the instructions to reset your password.`
                    })
                }).catch(err => {
                    return res.json({
                        message: err.message
                    });
                });
            };
        });
    });
};

exports.resetPassword = (req, res) => {
    const { resetPasswordLink, newPassword } = req.body;

    if (resetPasswordLink) {
        jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, (err, decodedToken) => {
            if (err) {
                return res.status(400).json({
                    message: "Token has been expired. Please Try again."
                })
            }

            User.findOne({ resetPasswordLink }, (err, user) => {
                if (err || !user) {
                    return res.status(400).json({
                        message: "User not found."
                    });
                }

                const updatedFields = {
                    password: newPassword,
                    resetPasswordLink: ""
                };

                user = _.extend(user, updatedFields);

                user.save((err, success) => {
                    if (err) {
                        console.log("ERR WHILE SAVING SAVING THE NEW PASSWORD =>", err);
                        return res.status(400).json({
                            message: "Error resetting the password. Please try again."
                        })
                    }

                    return res.status(200).json({
                        message: "Password reset was successful. Please login with your new password."
                    })
                });
            });
        })
    }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.googleLogin = (req, res) => {
    const { idToken } = req.body;

    client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID }).then(response => {
        // console.log("GOOGLE LOGIN RESPONSE => ", response);
        const { email_verified, name, email } = response.payload;

        if (email_verified) {
            User.findOne({ email }).exec((err, user) => {
                if (user) {
                    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
                    const { _id, email, name, role } = user;

                    return res.json({
                        token,
                        user: {
                            _id, email, name, role
                        }
                    });

                } else {
                    let password = email + process.env.JWT_SECRET;
                    user = new User({ name, email, password });
                    user.save((err, data) => {
                        if (err) {
                            console.log('ERROR GOOGLE LOGIN', err);
                            return res.status(400).json({
                                message: "Goggle signin failed"
                            });
                        }

                        const token = jwt.sign({ _id: data._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
                        const { _id, email, name, role } = data;

                        return res.json({
                            token,
                            user: {
                                _id, email, name, role
                            }
                        });
                    });
                }
            });
        } else {
            return res.status(400).json({
                message: "Google login failed, Try again."
            });
        }
    });
}

exports.facebookLogin = (req, res) => {
    const { userID, accessToken } = req.body;

    const url = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}`;

    return (
        fetch(url, {
            method: "GET",
        }).then(response => response.json())
            .then(response => {
                const { name, email } = response;

                User.findOne({ email }).exec((err, user) => {
                    if (user) {
                        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
                        const { _id, email, name, role } = user;

                        return res.json({
                            token,
                            user: {
                                _id, email, name, role
                            }
                        });
                    } else {
                        let password = email + process.env.JWT_SECRET;
                        user = new User({ name, email, password });
                        user.save((err, data) => {
                            if (err) {
                                console.log('ERROR FACEBOOK LOGIN', err);
                                return res.status(400).json({
                                    message: "Facebook signin failed"
                                });
                            }

                            const token = jwt.sign({ _id: data._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
                            const { _id, email, name, role } = data;

                            return res.json({
                                token,
                                user: {
                                    _id, email, name, role
                                }
                            });
                        });
                    }
                });
            })
            .catch(err => {
                return res.status(400).json({
                    message: 'Facebook login failed, Try again later.'
                })
            })
    );
}