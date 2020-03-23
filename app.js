const express = require('express'),
	app = express(),
	bodyParser = require('body-parser'),
	mongoose = require('mongoose'),
	session = require('express-session'),
	passport = require('passport'),
	LocalStrategy = require('passport-local'),
	passportLocalMongoose = require('passport-local-mongoose'),
	flash = require('connect-flash'),
	sgMail = require('@sendgrid/mail');

// ================================================================
// Configuration
// ================================================================

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(flash());

mongoose.connect("mongodb+srv://admin:qqLuPTe9fZZGo5ai@cluster0-aiymc.mongodb.net/hookup?retryWrites=true&w=majority", { useNewUrlParser: true, useUnifiedTopology: true });

app.use(
	session({
		secret: 'whatever you want',
		resave: false,
		saveUninitialized: false
	})
);

app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
	username: String,
	password: String
});

userSchema.plugin(passportLocalMongoose);

const User = mongoose.model('User', userSchema);

passport.use(new LocalStrategy({ usernameField: 'email' }, User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const userDetailsSchema = new mongoose.Schema({
	Name: String,
	FatherName: String,
	MotherName: String,
	Gender: String,
	DOB: String,
	BloodGroup: String,
	AddSession: String,
	AddSem: String,
	Status: String,
	Institute: String,
	Course: String,
	Branch: String,
	Semester: String,
	MobileNo: String,
	Email: String,
	Address: String,
	City_District: String,
	State: String,
	Country: String,
	Pincode: String,
	AKTURollNo: String,
	WhatsAppNo: String,
	Requests: Array,
	Avatar: String
});

const accReq = mongoose.model('accReq', { rollNo: Number });
const userDetail = mongoose.model('userinfo', userDetailsSchema);

// =========================================================
// MiddleWare
// =========================================================

function isAuthenticated(req, res, next){
	if (req.isAuthenticated()) {
		return next();
	}
	req.flash("error", "You Should Be Loged In To Do That!")
	res.redirect('/login');
}

// =========================================================
// Routes
// =========================================================

app.get('/', function(req, res) {
	res.render('home');
});

app.get('/login', function(req, res) {
	res.render('login', { message: req.flash('error') });
});

app.post(
	'/login',
	passport.authenticate('local', {
		successRedirect: '/dashboard',
		failureRedirect: '/login',
		failureFlash: true
	}),
	function(req, res) {}
);

app.get('/register', function(req, res) {
	res.render('register', { message: req.flash('message') });
});

app.post('/register', function(req, res) {
	userDetail.findOne({AKTURollNo: req.body.rollNo}, function(err, result) {
		if (result) {
			req.flash('message', 'Account Is Already Registered!');
			res.redirect('/register');
		} else {
			accReq.findOne({ rollNo: req.body.rollNo }, function(err, result) {
				if (!err && !result) {
					accReq.create({ rollNo: req.body.rollNo }, function(err, result) {
						if (!err) {
							req.flash(
								'message',
								'Thank You! For Sign Up Your Account Will Verified Within 24hrs And Password Will Be Send To You On Your AKTU Registered Email Id'
							);
							res.redirect('/register');
						}
					});
				} else {
					req.flash('message', 'Your Account Is Already Pending For Approval! Contact at Connect.GLBajaj@gmail.com');
					res.redirect('/register');
				}
			});
		}
	});
});

app.get("/forgetPassword", function(req, res){
	res.render("forgetPassword", {error: req.flash("error"), success: req.flash("success")})
});

app.post("/forgetPassword", function(req, res){
	userDetail.findOne({AKTURollNo: req.body.rollNo}, function(err, foundUser){
		if (!err){
			if(!foundUser){
				req.flash("error", "We Were Not Able To Find That Account!")
				res.redirect("/forgetPassword");
			} else {
				User.findOne({username: foundUser.Email}, function(err, user){
					newPassword = passGen();
					user.setPassword(newPassword, function(){
						user.save();
						sgMail.setApiKey("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");
						const msg = {
						to: foundUser.Email,
						from: 'Connect.GLBajaj@gmail.com',
						subject: 'Connect - Forget Password',
						html: "<strong>UserId: </strong>"+foundUser.Email+"<br><strong>Password: </strong>"+newPassword
						};
						sgMail.send(msg);
						req.flash("success", "New Password Has Been Send To Your Email Id.")
						res.redirect("/forgetPassword");
					});
				});	
			}
		}
	});
});

app.get('/dashboard', isAuthenticated, function(req, res) {
	userDetail.findOne({Email: req.user.username}, function(err, result){
		if(!err){
			userDetail.find({Requests: req.user.username}, function(err, matches){
				if(!err){
					if(!result.Avatar){
						if(result.Gender === "M"){
							result.Avatar = "M1.svg";
						} else {
							result.Avatar = "F1.svg";
						}
					}
					matches.forEach(function(match){
						if(!match.Avatar){
							if(match.Gender === "M"){
								match.Avatar = "M1.svg";
							} else {
								match.Avatar = "F1.svg";
							}
						}
					});
					for (index = 0; index < matches.length; index++){
						found = false
						result.Requests.forEach(function(userreqEmail){
							if (matches[index].Email == userreqEmail){
								found = true
							}
						});
						if (!found){
							matches.pop(index);
						}
					}
					res.render("dashboard/dashboard", 
					{username: capitalizeName(result.Name),
					avatar: result.Avatar,
					success: req.flash("success"),
					error: req.flash("error"), 
					matches: matches
				});
				}
			});
		}
	});
});

app.get('/profile', isAuthenticated, function(req, res) {
	userDetail.findOne({Email: req.user.username}, function(err, result){
		if(!err){
			if(!result.Avatar){
				if(result.Gender === "M"){
					result.Avatar = "M1.svg";
				} else {
					result.Avatar = "F1.svg";
				}
			}
			res.render("dashboard/userprofile", {userInfo: result, avatar: result.Avatar, username: capitalizeName(result.Name), message: req.flash("message")});
		}
	});
});

app.post('/avatar', function(req, res) {
	userDetail.findOne({Email: req.user.username}, function(err, foundUser){
		if(!err){
			foundUser["Avatar"] = req.body.avatar;
			foundUser.save();
			req.flash("message", "Avatar Updated Successfully!")
			res.redirect("/profile");
		}
	});
});

app.post("/updateWhatsApp", isAuthenticated, function(req, res){
	userDetail.findOne({Email: req.body.userId}, function(err, result){
		result["WhatsAppNo"] = req.body.whatsAppNo;
		result.save();
		req.flash("message", "WhatsApp Number Updated Successfully!")
		res.redirect("/profile");
	});
});

app.get("/changePassword", isAuthenticated, function(req, res){
	userDetail.findOne({Email: req.user.username}, function(err, result){
		if(!err){
			if(!result.Avatar){
				if(result.Gender === "M"){
					result.Avatar = "M1.svg";
				} else {
					result.Avatar = "F1.svg";
				}
			}
			res.render("dashboard/changePassword", {username: capitalizeName(result.Name), avatar: result.Avatar, userId: req.user.username, message: req.flash("message")})
		}
	});
});

app.post("/changePassword", isAuthenticated, function(req, res){
	User.findOne({username: req.body.userId}, function(err, user){
		user.setPassword(req.body.newPassword, function(){
			user.save();
			req.flash(
				'message',
				'Password Changed Successfully!'
			);
			res.redirect("/changePassword");
		})
	});
});

app.post("/search", isAuthenticated, function(req, res){
	userDetail.find({Name: req.body.searchQuery.toUpperCase()}, function(err, result){
		if (!err){
			userDetail.findOne({Email: req.user.username}, function(err, userInfo){
				if(!userInfo.Avatar){
					if(userInfo.Gender === "M"){
						userInfo.Avatar = "M1.svg";
					} else {
						userInfo.Avatar = "F1.svg";
					}
				}
				result.forEach(function(user){
					if(!user.Avatar){
						if(user.Gender === "M"){
							user.Avatar = "M1.svg";
						} else {
							user.Avatar = "F1.svg";
						}
					}
				});
				res.render("dashboard/searchResults", {searchResults: result, avatar: userInfo.Avatar, username: capitalizeName(userInfo.Name)});
			});
		}
	});
});

app.post("/matchReq", isAuthenticated, function(req, res){
	userDetail.findOne({Email: req.user.username}, function(err, foundUser){
		flag = false;
		if (!err){
			foundUser["Requests"].forEach(function(request){
				if(request == req.body.matchUserId){
					req.flash("error", "Request Already Been Made!");
					res.redirect("/dashboard");
					flag = true;
				}
			});
			if (!flag){
				foundUser["Requests"].push(req.body.matchUserId);
				foundUser.save();
				req.flash("success", "Request Send Successfully!")
				res.redirect("/dashboard");
			}
		} else {
			console.log(err);	
		}
	})
});

app.get("/logout", isAuthenticated, function(req, res){
	req.logout();
	res.redirect("/");
});

app.get("*", function(req, res){
	res.render("404");
});

app.listen(process.env.PORT, function() {
	console.log('Server Started Sucessfully on Port 3000');
});

capitalizeName = function(str){
	str = str.split(" ");
	outputStr = ""
	str.forEach(word => {
		outputStr += word[0] + word.slice(1).toLowerCase() + " ";
	});
	return outputStr;
}

passGen = function(){
	password = ""
	for (i = 0; i < 8; i++){
		password += String(Math.floor(Math.random()*10));
	}
	return password;
}