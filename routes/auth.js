const express = require('express');
const router = express.Router();

// importing auth controllers
const { signUp, accountActivation, signIn, forgotPassword, resetPassword, googleLogin, facebookLogin } = require("../controllers/auth");

// importing validators
const { userSignupValidator, userSigninValidator, resetPasswordValidator, forgotPasswordValidator } = require('../validators/auth');
const { runValidation } = require('../validators');

router.post('/signup', userSignupValidator, runValidation, signUp);
router.post('/signin', userSigninValidator, runValidation, signIn);
router.post('/account-activation', accountActivation);

// forgot and reset password routes
router.put('/forgot-password', forgotPasswordValidator, runValidation, forgotPassword);
router.put('/reset-password', resetPasswordValidator, runValidation, resetPassword);

// google and facebook
router.post('/google-login', googleLogin);
router.post('/facebook-login', facebookLogin);

module.exports = router;