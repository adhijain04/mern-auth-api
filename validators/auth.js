const { check } = require('express-validator');

exports.userSignupValidator = [
    check('name')
        .not()
        .isEmpty()
        .withMessage('Name is required'),
    check('email')
        .isEmail()
        .withMessage('Enter a valid email address'),
    check('password')
        .isLength({ min: 6 })
        .withMessage("Password must at least 6 characters long")
];

exports.userSigninValidator = [
    check('email')
        .isEmail()
        .withMessage('Enter a valid email address'),
    check('password')
        .isLength({ min: 6 })
        .withMessage("Password must at least 6 characters long")
];

exports.forgotPasswordValidator = [
    check('email')
        .not()
        .isEmpty()
        .isEmail()
        .withMessage('Enter a valid email address'),
];

exports.resetPasswordValidator = [
    check('newPassword')
        .isLength({ min: 6 })
        .withMessage("Password must at least 6 characters long")
];