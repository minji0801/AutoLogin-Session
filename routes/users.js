var express = require('express');
var router = express.Router();

/* 추가한 부분 */
var app = express();
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const passport = require('passport')
    , LocalStrategy = require('passport-local').Strategy
    , NaverStrategy = require('passport-naver').Strategy
    , KakaoStrategy = require('passport-kakao').Strategy
    , FacebookStrategy = require('passport-facebook').Strategy
    , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
/* 여기까지 */

const mssql = require('mssql');
const multer = require('multer');
const path = require('path');
/* GET home page. */

const nodemailer = require("nodemailer");

const fs = require('fs');
const emlformat = require('eml-format');


const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// var DomParser = require('dom-parser');


const config = {
    // "user"      : "sa",
    // "password"  : "qw12qw12)",
    // "server"    : "192.168.0.122",
    // "port"      : 1433,
    // "database"  : "aTEST",
    // "timezone"  : 'utc',
    // "options"   : {
    //     "encrypt" : false
    // }
    // "user": "test",
    "user": "sa",
    "password": "qw12qw12",
    //"server": "192.168.137.1",
    "server": "192.168.0.134",
    // "server": "192.168.35.17",
    //"server"    : "192.168.0.135",
    "port": 1433,
    "database": "aTEST",
    // "timezone"  : 'utc',
    "options": {
        encrypt: false, // Use this if you're on Windows Azure 
        enableArithAbort: true
    }
}


/* configuration */
app.use(cors());
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: false }));
router.use(cookieParser());


/* passport와 flash는 반드시 session 다음에 */
router.use(passport.initialize());
router.use(passport.session());


// 로그인이 성공하면 serializerUser로 user정보를 세션에 저장
passport.serializeUser(function (user, done) {
    console.log("serializeUser ", user)
    done(null, user);
});

// Node.js의 모든 페이지에 접근할때, 로그인이 되어있을 경우
// deserializeUser로 session에 저장된 값을 이용 
passport.deserializeUser(function (user, done) {
    console.log("deserializeUser user ", user)
    done(null, user);   // 이 값은 req.user에 저장됨
});


// 사용자 회원가입(이메일가입)
router.post('/signup', function (req, res, next) {
    try {
        console.log('api/signup!!');
        console.log(req.body.name);
        console.log(req.body.email);
        console.log(req.body.pw);

        var id = Math.random().toString(36).slice(2);
        var email = req.body.email;
        var pw = req.body.pw;
        var name = req.body.name;

        mssql.connect(config, function (err) {

            console.log('Connect');
            var request = new mssql.Request();

            var checkEmail = "SELECT * FROM tALU WHERE email = '" + email + "'";
            var insertData = "INSERT INTO tALU VALUES ('" + id + "', '" + email + "', '" + pw + "', '" + name + "', 'email');";

            request.query(checkEmail, function (err, result) {

                if (result.rowsAffected[0] == 0) {

                    // 중복 없음 -> 회원가입 가능
                    request.query(insertData, function (err, result) {

                        console.log('이메일 중복없음!');
                        res.json({ data: 'OK', id: id });
                    })
                } else {

                    // 중복 있음 -> 회원가입 불가능
                    console.log('이메일 중복있음!');
                    res.json({ data: 'NO' });
                }
            })
        });
    }
    catch (err) {
        console.log(err);
    }
});

// passport - username & password
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'pw'
},
    function (username, password, done) {
        console.log('passport-local!!');
        try {
            mssql.connect(config, function (err) {

                console.log('Connect');
                var request = new mssql.Request();

                var queryString = "SELECT * FROM tALU WHERE email = '" + username + "' AND pw = '" + password + "'";

                request.query(queryString, function (err, result) {

                    // 이메일, 비밀번호 확인
                    if (result.rowsAffected[0] === 0) {

                        // DB에 없음
                        console.log("DB에 없음!");
                        return done(null, false);

                    } else {

                        // DB에 있음
                        console.log("DB에 있음!");
                        var json = JSON.stringify(result.recordset[0]);
                        var userinfo = JSON.parse(json);
                        return done(null, userinfo);
                    }
                })
            });
        }
        catch (err) {
            console.log(err);
        }
    }
));

// 이메일로그인
router.post('/emaillogin', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        console.log('passport-local callback!');

        if (!user) {

            // user 없음
            return res.redirect('/login');
        }

        // user 있음
        req.logIn(user, function (err) {

            req.session.save(function () {

                console.log('emaillogin/callback user : ', req.user);

                // user_session 쿠키 생성
                res.cookie("user_session", req.sessionID, {
                    maxAge: 31536000000 // 1년
                });

                return res.redirect('/welcome');
            });
        });
    })(req, res, next);
});

// passport - naver
passport.use(new NaverStrategy({
    clientID: 'jKCn5fyjj_lrGShea38E',
    clientSecret: 'gc3RUBRg5R',
    callbackURL: 'http://192.168.0.134:8087/users/naverlogin/callback'
},
    function (accessToken, refreshToken, profile, done) {
        try {
            console.log('passport-naver!!');
            console.log('naver-login-profile : ', profile);

            var user = {
                id: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                provider: profile.provider,
                /* profile_image: profile._json.profile_image,
                age: profile._json.age,
                birthday: profile._json.birthday */
            };

            mssql.connect(config, function (err) {

                console.log('Connect');
                var request = new mssql.Request();

                var checkUser = "SELECT * FROM tALU WHERE id = '" + user.id + "' AND provider = '" + user.provider + "'";
                var insertData = "INSERT INTO tALU VALUES ('" + user.id + "', '" + user.email + "', '" + user.pw + "', '" + user.name + "', '" + user.provider + "')";

                request.query(checkUser, function (err, result) {

                    if (result.rowsAffected[0] == 0) {

                        // DB에 없는 사용자
                        // 회원가입
                        request.query(insertData, function (err, result) {

                            return done(null, user);
                        })

                    } else {

                        // DB에 있는 사용자
                        // 로그인
                        return done(null, user);
                    }
                })
            });
        }
        catch (err) {
            console.log(err);
        }
    }
));

// 네이버로그인
router.get('/naverlogin', passport.authenticate('naver', { failureRedirect: '/login' }));

// 네이버로그인 콜백
router.get('/naverlogin/callback', function (req, res, next) {
    passport.authenticate('naver', function (err, user) {

        console.log('passport-naver callback!');

        if (!user) {

            // user 없음
            console.log('no user');
            return res.redirect('/login');

        } else {

            // user 있음
            req.logIn(user, function (err) {

                req.session.save(function () {

                    console.log('naverlogin/callback user : ', user);

                    // user_session 쿠키 생성
                    res.cookie("user_session", req.sessionID, {
                        maxAge: 31536000000 // 1년
                    });

                    return res.redirect('/welcome');
                });
            });
        }
    })(req, res);
});

// passport-kakao
passport.use(new KakaoStrategy({
    clientID: 'f4a7066d8d575a30efc4bedb0796989d',
    callbackURL: 'http://192.168.0.134:8087/users/kakaologin/callback',
},
    function (accessToken, refreshToken, profile, done) {
        try {
            console.log('passport-kakao!!');
            console.log('kakao-login-profile : ', profile);

            var user = {
                id: profile.id,
                email: profile._json.kakao_account.email,
                name: profile.username,
                provider: profile.provider,
                /* profile_image: profile._json.kakao_account.profile.profile_image_url,
                age: profile._json.kakao_account.age_range,
                birthday: profile._json.kakao_account.birthday,
                birthday_type: profile._json.kakao_account.birthday_type,
                gender: profile._json.kakao_account.gender */
            };

            mssql.connect(config, function (err) {

                console.log('Connect');
                var request = new mssql.Request();

                var checkUser = "SELECT * FROM tALU WHERE id = '" + user.id + "' AND provider = '" + user.provider + "'";
                var insertData = "INSERT INTO tALU VALUES ('" + user.id + "', '" + user.email + "', '" + user.pw + "', '" + user.name + "', '" + user.provider + "')";

                request.query(checkUser, function (err, result) {

                    if (result.rowsAffected[0] == 0) {

                        // DB에 없는 사용자
                        // 회원가입
                        request.query(insertData, function (err, result) {

                            return done(null, user);
                        })

                    } else {

                        // DB에 있는 사용자
                        // 로그인
                        return done(null, user);
                    }
                })
            });
        }
        catch (err) {
            console.log(err);
        }
    }
));

// 카카오로그인
router.get('/kakaologin', passport.authenticate('kakao', { failureRedirect: '/login' }));

// 카카오로그인 콜백
router.get('/kakaologin/callback', function (req, res, next) {
    passport.authenticate('kakao', function (err, user) {

        console.log('passport-kakao callback!');

        if (!user) {

            // user 없음
            console.log('no user');
            return res.redirect('/login');

        } else {

            // user 있음
            req.logIn(user, function (err) {

                req.session.save(function () {

                    console.log('kakaologin/callback user : ', user);

                    // user_session 쿠키 생성
                    res.cookie("user_session", req.sessionID, {
                        maxAge: 31536000000 // 1년
                    });

                    return res.redirect('/welcome');
                });
            });
        }
    })(req, res);
});

// passport-facebook
passport.use(new FacebookStrategy({
    clientID: '872351713594449',
    clientSecret: '1d63016dd325a43ce7c9a81ab5d8c3a1',
    callbackURL: "https://192.168.0.134/users/facebooklogin/callback",
    profileFields: ['email', 'id', 'displayName', 'photos']
},
    function (accessToken, refreshToken, profile, done) {

        try {
            console.log('passport-facebook!!');
            console.log('facebook-login-profile : ', profile);

            var user = {
                id: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                provider: profile.provider,
                //profile_image: profile.photos[0].value
            };

            mssql.connect(config, function (err) {

                console.log('Connect');
                var request = new mssql.Request();

                var checkUser = "SELECT * FROM tALU WHERE id = '" + user.id + "' AND provider = '" + user.provider + "'";
                var insertData = "INSERT INTO tALU VALUES ('" + user.id + "', '" + user.email + "', '" + user.pw + "', '" + user.name + "', '" + user.provider + "')";

                request.query(checkUser, function (err, result) {

                    if (result.rowsAffected[0] == 0) {

                        // DB에 없는 사용자
                        // 회원가입
                        request.query(insertData, function (err, result) {

                            return done(null, user);
                        })

                    } else {

                        // DB에 있는 사용자
                        // 로그인
                        return done(null, user);
                    }
                })
            });
        }
        catch (err) {
            console.log(err);
        }
    }
));

// 페이스북로그인
router.get('/facebooklogin', passport.authenticate('facebook', {
    scope: ['email'],
    nfailureRedirect: '/login'
}));

// 페이스북로그인 콜백
router.get('/facebooklogin/callback', function (req, res, next) {
    passport.authenticate('facebook', function (err, user) {

        console.log('passport-facebook callback!!');

        if (!user) {

            // user 없음
            console.log('no user');
            return res.redirect('/login');

        } else {

            // user 있음
            req.logIn(user, function (err) {

                req.session.save(function () {

                    console.log('facebooklogin/callback user : ', user);

                    // user_session 쿠키 생성
                    res.cookie("user_session", req.sessionID, {
                        maxAge: 31536000000 // 1년
                    });

                    return res.redirect('/welcome');
                });
            });
        }
    })(req, res);
});

// passport-google
passport.use(new GoogleStrategy({
    clientID: '706426410759-v8mjqnsi67efdprf0qsg6pm78ckjt7ie.apps.googleusercontent.com',
    clientSecret: 'QxHrFf2R2sxV7JPP3hmEf0B_',
    callbackURL: "http://localhost:8087/users/googlelogin/callback"
},
    function (accessToken, refreshToken, profile, done) {

        try {
            console.log('passport-google!!');
            console.log('google-login-profile : ', profile);

            var user = {
                id: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                provider: profile.provider,
                /* profile_image: profile.photos[0].value,
                locale: profile._json.locale */
            };

            mssql.connect(config, function (err) {

                console.log('Connect');
                var request = new mssql.Request();

                var checkUser = "SELECT * FROM tALU WHERE id = '" + user.id + "' AND provider = '" + user.provider + "'";
                var insertData = "INSERT INTO tALU VALUES ('" + user.id + "', '" + user.email + "', '" + user.pw + "', '" + user.name + "', '" + user.provider + "')";

                request.query(checkUser, function (err, result) {

                    if (result.rowsAffected[0] == 0) {

                        // DB에 없는 사용자
                        // 회원가입
                        request.query(insertData, function (err, result) {

                            return done(null, user);
                        })

                    } else {

                        // DB에 있는 사용자
                        // 로그인
                        return done(null, user);
                    }
                })
            });
        }
        catch (err) {
            console.log(err);
        }
    }
));

// 구글로그인
router.get('/googlelogin', passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/plus.login', 'email'],
    failureRedirect: '/login'
}));

// 구글로그인 콜백
router.get('/googlelogin/callback', function (req, res, next) {
    passport.authenticate('google', function (err, user) {

        console.log('passport-google callback!');

        if (!user) {

            // user 없음
            console.log('no user');
            return res.redirect('/login');

        } else {

            // user 있음
            req.logIn(user, function (err) {

                req.session.save(function () {

                    console.log('googlelogin/callback user : ', user);

                    // user_session 쿠키 생성
                    res.cookie("user_session", req.sessionID, {
                        maxAge: 31536000000 // 1년
                    });

                    return res.redirect('/welcome');
                });
            });
        }
    })(req, res);
});

// 로그아웃
router.post('/logout', function (req, res, next) {

    // user_session 쿠키 삭제
    res.clearCookie('user_session');

    // 셔센 파일 삭제
    var file = 'sessions/' + req.sessionID + '.json';
    fs.unlink(file, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('세션파일을 삭제했습니다!!');
            res.redirect('/login');
        }
    })
});

// 세션확인
router.get('/getSession', function (req, res, next) {

    try {

        var sessionID = req.sessionID;

        console.log('sessionID : ', sessionID);

        // 1. user_session 쿠키가 있는지 확인하기
        var user_session = req.cookies.user_session;

        if (user_session == undefined) {

            // 없음
            // 1-1. 로그인화면 보여주기
            console.log('user_session 쿠키 없음!!');
            res.json({ data: 'NO' });

        } else {

            // 있음
            console.log('user_session 쿠키 있음!!');

            // 1-2. user_session 값(세션ID), 지금 세션ID 같은지 확인하기
            if (user_session == sessionID) {

                // 같음
                // 1-2-1. 메인으로 이동(자동로그인)
                console.log('세션ID 같음!!');
                res.json({ data: 'OK' });

            } else {

                // 다름
                // 1-2-2. 세션내용 옮기고 파일삭제 후 메인으로 이동(자동로그인)
                console.log('세션ID 다름!!');

                // sessions 폴더에 user_session가 파일명인 파일 내용 가져와서 passport 부분만 잘라오기
                var c_file = fs.readFileSync('sessions/' + user_session + '.json');
                var c_fileToJson = JSON.parse(c_file);
                var c_jsonToString = JSON.stringify(c_fileToJson.passport);

                // 현재 세션파일 내용 가져오기
                var s_file = fs.readFileSync('sessions/' + sessionID + '.json');
                var s_fileToJson = JSON.parse(s_file);
                var s_jsonToString = JSON.stringify(s_fileToJson);

                // 두 내용 붙이기
                var str = s_jsonToString.substr(0, s_jsonToString.length - 1);
                str = str + ',"passport":' + c_jsonToString + '}';
                console.log('str : ', str);

                // 현재세션파일에 내용 덮어쓰기
                var file = 'sessions/' + sessionID + '.json';
                fs.writeFile(file, str, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('세션파일을 덮어썼습니다!!');
                    }
                });

                // 쿠키셔센 파일 삭제
                var file = 'sessions/' + user_session + '.json';
                fs.unlink(file, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log('쿠키세션파일을 삭제했습니다!!');
                    }
                })

                // 쿠키삭제하고 현재세션ID로 쿠키 생성
                res.cookie('user_session', sessionID, {
                    maxAge: 31536000000 // 1년
                });
                res.json({ data: 'OK' });
            }
        }
    } catch (err) {
        console.log(err);
    }
});

// 로그인한 사용자 이름 가져오기
router.get('/getName', function (req, res, next) {

    try {

        console.log('sessionID : ', req.sessionID);

        data = req.user.name;
        res.json({ data: data });

    } catch (err) {
        console.log(err);
    }
});

/* GET users listing. */
router.get('/', function (req, res, next) {
    res.send('respond with a resource');
});

module.exports = router;