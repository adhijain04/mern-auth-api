const User = require('../models/user');

exports.read = (req, res) => {
    const userId = req.params.id;

    User.findById(userId).exec((err, user) => {
        if (err || !user) {
            return res.status(400).json({
                message: "User not found."
            });
        }

        user.hashed_password = undefined;
        user.salt = undefined;

        res.json(user);
    })
}

exports.update = (req, res) => {
    const userId = req.user._id;
    const { name, password } = req.body; // to update the data

    User.findById(userId).exec((err, user) => {
        if (err || !user) {
            return res.status(400).json({
                message: "User not found."
            });
        }

        if (!name) {
            return res.status(400).json({
                message: "Name is required."
            });
        } else {
            user.name = name;
        }

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    message: "Password should not be less then 6 characters."
                });
            } else {
                user.password = password;
            }
        }

        user.save((err, updatedUser) => {
            if (err) {
                console.log('USER UPDATE ERROR =>', err);
                return res.status(400).json({
                    message: "User update failed"
                });
            }
            updatedUser.hashed_password = undefined;
            updatedUser.salt = undefined;
            
            res.json(updatedUser);
        });
    })
}